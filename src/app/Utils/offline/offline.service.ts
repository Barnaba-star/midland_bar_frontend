import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../enviroments/environment';
import { Authentication } from '../services/authentication';
import { SILENT_REQUEST } from '../inteceptor/silent-request';
import { idbGet, idbSet } from './offline-store';

/** Requests the sync sends itself - the offline interceptor lets them straight through. */
export const OFFLINE_BYPASS = new HttpContextToken<boolean>(() => false);
/** Requests the offline layer answers when the network fails - the status interceptor stays quiet about them. */
export const OFFLINE_AWARE = new HttpContextToken<boolean>(() => false);

export type OpKind = 'SHIFT_OPEN' | 'SHIFT_CLOSE' | 'OPEN_BILL' | 'ADD_ITEMS' | 'PAY_BILL' | 'STAFF_OPEN_BILL' | 'STAFF_ORDER' | 'REMOVE_LINE' | 'STAFF_LOSS';

/** A sale (or shift change) made on this device and not yet on the server. */
export interface QueuedOp {
  id: string;
  kind: OpKind;
  /** The login it was made under - only that login sends it. */
  user: string;
  url: string;
  body: any;
  /** When it happened on the device (epoch ms) - the server records it at this time. */
  at: number;
  /** What the screen needs to show it before the server has it: lines, totals, codes. */
  meta?: any;
}

export interface FailedOp extends QueuedOp {
  message: string;
  failedAt: number;
}

/** Thrown back to a page for something that cannot be done offline, or not in this state. */
export class OfflineRefusal extends Error {}

const BAR = () => `${environment.baseApiUrl}/bar`;

/**
 * The Bar's offline mode. With no internet the Sales page keeps working on
 * this device: shifts open and close, bills open, items go on, bills are paid
 * and receipts print. Each of those is kept in a queue (with the time it
 * happened and an id of its own) and sent to the server, in order, as soon as
 * the connection is back; the server applies each once and at its real time.
 * Until the queue is empty the screens show the last known server data with
 * the queued work laid over it. Everything else (reports, cash-up, settings)
 * needs the internet and says so.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
  private http = inject(HttpClient);
  private auth = inject(Authentication);
  readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly online = signal(true);
  readonly syncing = signal(false);
  private readonly outbox = signal<QueuedOp[]>([]);
  readonly failed = signal<FailedOp[]>([]);
  /** Staff Sell orders written offline and not sent yet - a staff member's notes, not queued work. */
  private readonly drafts = signal<any[]>([]);
  /** This login's queued work. */
  readonly pending = computed(() => this.outbox().filter((op) => op.user === this.user()));
  /** Queued work of another login on this device - sent when they sign in. */
  readonly othersPending = computed(() => this.outbox().filter((op) => op.user !== this.user()).length);
  /** Fires when the queue has gone through, so pages reload the server's data. */
  readonly synced = new Subject<void>();

  private loaded: Promise<void> | null = null;
  private pingTimer: any = null;

  constructor() {
    if (!this.browser) {
      return;
    }
    this.online.set(navigator.onLine);
    window.addEventListener('online', () => this.checkConnection());
    window.addEventListener('offline', () => this.setOffline());
    this.ready().then(() => this.sync());
    // While offline, look for the connection every 15 seconds; while work is
    // queued, try to send it.
    this.pingTimer = setInterval(() => {
      if (!this.online()) {
        this.checkConnection();
      } else if (this.pending().length && !this.syncing()) {
        this.sync();
      }
    }, 15000);
  }

  ready(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        this.outbox.set((await idbGet<QueuedOp[]>('outbox')) ?? []);
        this.failed.set((await idbGet<FailedOp[]>('failed')) ?? []);
        this.drafts.set((await idbGet<any[]>('drafts')) ?? []);
      })();
    }
    return this.loaded;
  }

  user(): string {
    try {
      return this.auth.getToken() ? this.auth.getUsername() || '' : '';
    } catch {
      return '';
    }
  }

  /** Offline, or online with this login's work still waiting to go - either way new work is queued behind it. */
  get queueing(): boolean {
    return !this.online() || this.pending().length > 0;
  }

  setOffline(): void {
    this.online.set(false);
  }

  /** Any answer from the server (even an error page) means it is reachable. */
  async checkConnection(): Promise<void> {
    if (!this.browser) {
      return;
    }
    try {
      await fetch(`${environment.baseApiUrl}/`, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
      const was = this.online();
      this.online.set(true);
      if (!was || this.pending().length) {
        this.sync();
      }
    } catch {
      this.online.set(false);
    }
  }

  // ------------------------------------------------------------------
  // Cache of server answers
  // ------------------------------------------------------------------

  private cacheKey(url: string): string {
    return `cache|${this.user()}|${url}`;
  }

  remember(url: string, body: any): void {
    idbSet(this.cacheKey(url), body);
  }

  recall<T = any>(url: string): Promise<T | undefined> {
    return idbGet<T>(this.cacheKey(url));
  }

  /**
   * While online, fetch what selling needs offline - codes, items and prices,
   * staff, open bills, the shift - so it is on the device before the line
   * drops. Goes through the interceptor, which keeps each answer.
   */
  warmUp(): void {
    if (!this.browser || !this.online() || this.queueing) {
      return;
    }
    for (const path of ['/shift/current', '/salesOpenedList', '/findAvailableBillCodes', '/findBarServiceList', '/findBarStaffList']) {
      this.http.get(`${BAR()}${path}`, { context: new HttpContext().set(SILENT_REQUEST, true) }).subscribe({ error: () => {} });
    }
  }

  // ------------------------------------------------------------------
  // Queueing work
  // ------------------------------------------------------------------

  newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  }

  async enqueue(op: QueuedOp): Promise<void> {
    await this.ready();
    this.outbox.set([...this.outbox(), op]);
    await idbSet('outbox', this.outbox());
  }

  private async saveQueues(): Promise<void> {
    await idbSet('outbox', this.outbox());
    await idbSet('failed', this.failed());
  }

  dismissFailed(id: string): void {
    this.failed.set(this.failed().filter((f) => f.id !== id));
    idbSet('failed', this.failed());
  }

  /**
   * Sends this login's queued work in the order it happened. Each goes with
   * its id (applied once, however often it is sent) and its time. A refusal
   * (a code taken meanwhile, a bill already paid elsewhere) is set aside with
   * the server's reason and the rest carries on; no connection stops the run
   * until the next try.
   */
  async sync(): Promise<void> {
    if (!this.browser || this.syncing() || !this.online() || !this.auth.getToken()) {
      return;
    }
    await this.ready();
    if (!this.pending().length) {
      return;
    }
    this.syncing.set(true);
    let sentAny = false;
    try {
      while (true) {
        const op = this.pending()[0];
        if (!op) {
          break;
        }
        let outcome: 'done' | 'refused' | 'stop' = 'done';
        let message = '';
        try {
          const res: any = await firstValueFrom(this.http.request('POST', op.url, {
            body: op.body,
            headers: new HttpHeaders({ 'X-Offline': '1', 'X-Op-Id': op.id, 'X-Client-Time': String(op.at) }),
            context: new HttpContext().set(OFFLINE_BYPASS, true).set(SILENT_REQUEST, true),
          }));
          if (!res || res.data === null || res.data === undefined) {
            outcome = 'refused';
            message = res?.message || 'Refused';
          }
        } catch (err) {
          const e = err as HttpErrorResponse;
          if (e?.status === 0) {
            this.setOffline();
            outcome = 'stop';
          } else if (e?.status === 401) {
            outcome = 'stop';
          } else {
            outcome = 'refused';
            message = e?.error?.message || e?.message || `Error ${e?.status}`;
          }
        }
        if (outcome === 'stop') {
          break;
        }
        this.outbox.set(this.outbox().filter((o) => o.id !== op.id));
        if (outcome === 'refused') {
          this.failed.set([...this.failed(), { ...op, message, failedAt: Date.now() }]);
        }
        sentAny = true;
        await this.saveQueues();
      }
    } finally {
      this.syncing.set(false);
    }
    if (sentAny && !this.pending().length) {
      this.synced.next();
    }
  }

  // ------------------------------------------------------------------
  // What the screens see while work is queued
  // ------------------------------------------------------------------

  private opsOf(kind: OpKind): QueuedOp[] {
    return this.pending().filter((op) => op.kind === kind);
  }

  /** The login's shift as the server last said, with queued opens and closes on top. */
  async shiftView(): Promise<any> {
    const base = (await this.recall<any>(`${BAR()}/shift/current`))?.data ?? { state: 'NONE', shift: null, others: [] };
    let view = { ...base, shift: base.shift ? { ...base.shift } : null };
    for (const op of this.pending()) {
      if (op.kind === 'SHIFT_OPEN') {
        view = { ...view, state: 'OPEN', shift: { openedAt: toLocalIso(op.at), status: 'OPEN', offline: true } };
      } else if (op.kind === 'SHIFT_CLOSE') {
        view = { ...view, state: 'CLOSED', shift: { ...(view.shift ?? {}), closedAt: toLocalIso(op.at), status: 'CLOSED' } };
      }
    }
    return view;
  }

  /** Open bills as the server last listed them, with bills opened, added to and paid here on top. */
  async openBillsView(): Promise<any[]> {
    let bills: any[] = ((await this.recall<any>(`${BAR()}/salesOpenedList`))?.data ?? []).map((b: any) => ({ ...b }));
    for (const op of this.pending()) {
      if (op.kind === 'OPEN_BILL' || op.kind === 'STAFF_OPEN_BILL') {
        bills.push({ ...op.meta.bill });
      } else if (op.kind === 'ADD_ITEMS' || op.kind === 'STAFF_ORDER') {
        bills = bills.map((b) => (b.uid === op.body.salesOpenedUID ? { ...b, bill: (Number(b.bill) || 0) + op.meta.total } : b));
      } else if (op.kind === 'PAY_BILL') {
        bills = bills.filter((b) => b.uid !== op.body.salesOpenedUID);
      } else if (op.kind === 'REMOVE_LINE') {
        bills = bills.map((b) => (b.uid === op.meta.billUid ? { ...b, bill: Math.max(0, (Number(b.bill) || 0) - op.meta.amount) } : b));
      }
    }
    return bills;
  }

  async billLinesView(billUid: string): Promise<any[]> {
    const lines: any[] = [...((await this.recall<any>(`${BAR()}/findBarSalesList/${billUid}`))?.data ?? [])];
    let out = lines.map((l) => ({ ...l }));
    for (const op of this.pending()) {
      if ((op.kind === 'ADD_ITEMS' || op.kind === 'STAFF_ORDER') && op.body.salesOpenedUID === billUid) {
        out.push(...op.meta.lines.map((l: any) => ({ ...l })));
      } else if (op.kind === 'REMOVE_LINE' && op.meta.billUid === billUid) {
        out = out
          .map((l) => (l.uid === op.meta.lineUid
            ? { ...l, quantity: (Number(l.quantity) || 1) - op.meta.qty, lineTotal: (Number(l.lineTotal ?? l.price) || 0) - op.meta.amount }
            : l))
          .filter((l) => (Number(l.quantity) || 0) > 0);
      }
    }
    return out;
  }

  async freeCodesView(): Promise<string[]> {
    const free = new Set<string>((await this.recall<any>(`${BAR()}/findAvailableBillCodes`))?.data ?? []);
    const bills = await this.openBillsView();
    for (const op of this.opsOf('PAY_BILL')) {
      if (op.meta?.salesCode) {
        free.add(op.meta.salesCode);
      }
    }
    for (const b of bills) {
      free.delete(b.salesCode);
    }
    return [...free].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  /** A receipt for a bill opened or paid here, from what this device knows. */
  async receiptView(billUid: string): Promise<any | null> {
    const pay = this.opsOf('PAY_BILL').find((op) => op.body.salesOpenedUID === billUid);
    const cached = (await this.recall<any>(`${BAR()}/findBillReceipt/${billUid}`))?.data;
    const lines = await this.billLinesView(billUid);
    const bill = (await this.openBillsView()).find((b) => b.uid === billUid) ?? pay?.meta?.bill ?? null;
    if (!bill && !cached) {
      return null;
    }
    const total = lines.reduce((s, l) => s + (Number(l.lineTotal ?? l.price) || 0), 0);
    return {
      ...(cached ?? {}),
      uid: billUid,
      code: bill?.salesCode ?? cached?.code,
      branchName: cached?.branchName,
      status: pay ? 'PAID' : cached?.status ?? 'PENDING',
      total,
      paidBy: pay ? pay.user : cached?.paidBy,
      staffCode: bill?.staffCode ?? cached?.staffCode,
      staffName: bill?.staffName ?? cached?.staffName,
      paidAt: pay ? toLocalIso(pay.at) : cached?.paidAt,
      lines: lines.map((l) => ({ name: l.serviceName, quantity: l.quantity || 1, unitPrice: l.price, lineTotal: l.lineTotal ?? l.price })),
      payments: pay ? pay.body.payments.map((p: any) => ({ method: p.method, amount: p.amount, tendered: p.tendered ?? null, change: p.tendered ? p.tendered - p.amount : null })) : cached?.payments ?? [],
      offline: true,
    };
  }

  // ------------------------------------------------------------------
  // Doing the work here - checked as the server would, then queued
  // ------------------------------------------------------------------

  async queueShiftOpen(url: string, id = this.newId()): Promise<any> {
    const view = await this.shiftView();
    if (view.state === 'OPEN') throw new OfflineRefusal('SHIFT_ALREADY_OPEN');
    if (view.state === 'CLOSED') throw new OfflineRefusal('SHIFT_NEEDS_CASHUP');
    const at = Date.now();
    await this.enqueue({ id, kind: 'SHIFT_OPEN', user: this.user(), url, body: {}, at });
    return { openedAt: toLocalIso(at), status: 'OPEN', offline: true };
  }

  async queueShiftClose(url: string, id = this.newId()): Promise<any> {
    const view = await this.shiftView();
    if (view.state !== 'OPEN') throw new OfflineRefusal('NO_OPEN_SHIFT');
    const at = Date.now();
    await this.enqueue({ id, kind: 'SHIFT_CLOSE', user: this.user(), url, body: {}, at });
    return { ...(view.shift ?? {}), closedAt: toLocalIso(at), status: 'CLOSED', offline: true };
  }

  private async requireOpenShift(): Promise<void> {
    if ((await this.shiftView()).state !== 'OPEN') {
      throw new OfflineRefusal('NO_OPEN_SHIFT');
    }
  }

  async queueOpenBill(url: string, body: any, id = this.newId()): Promise<any> {
    if (body?.uid) throw new OfflineRefusal('NEEDS_INTERNET');
    await this.requireOpenShift();
    const clientUid = body.clientUid ?? this.newId();
    const at = Date.now();
    const bill = {
      uid: clientUid, salesCode: body.salesCode, bill: 0, paidAmount: 0, paymentStatus: 'PENDING', status: 'ACTIVE',
      createdAt: toLocalIso(at).slice(0, 10), staffCode: null, staffName: null, offline: true,
      openedBy: this.user(), openedByName: this.auth.getFullName?.() || this.user(),
    };
    await this.enqueue({ id, kind: 'OPEN_BILL', user: this.user(), url, body: { ...body, clientUid }, at, meta: { bill } });
    return bill;
  }

  async queueAddItems(url: string, body: any, id = this.newId()): Promise<any> {
    await this.requireOpenShift();
    const bill = (await this.openBillsView()).find((b) => b.uid === body.salesOpenedUID);
    if (!bill) throw new OfflineRefusal('BILL_NOT_FOUND');
    const services: any[] = (await this.recall<any>(`${BAR()}/findBarServiceList`))?.data ?? [];
    const lines = (body.items ?? []).map((item: any, i: number) => {
      const svc = services.find((s) => s.uid === item.barServiceUID);
      if (!svc || !svc.price) throw new OfflineRefusal('ITEM_NOT_CACHED');
      const quantity = Number(item.quantity) || 1;
      return {
        uid: `offline-${id}-${i}`, barServiceUid: svc.uid, serviceName: svc.serviceName, serviceCode: svc.serviceCode, quantity,
        price: svc.price, lineTotal: svc.price * quantity, firstName: this.auth.getFullName?.() || this.user(), salesCode: bill.salesCode, offline: true,
      };
    });
    const total = lines.reduce((s: number, l: any) => s + l.lineTotal, 0);
    await this.enqueue({ id, kind: 'ADD_ITEMS', user: this.user(), url, body, at: Date.now(), meta: { lines, total } });
    return { ...bill, bill: (Number(bill.bill) || 0) + total };
  }

  async queuePayBill(url: string, body: any, id = this.newId()): Promise<any> {
    await this.requireOpenShift();
    const bill = (await this.openBillsView()).find((b) => b.uid === body.salesOpenedUID);
    if (!bill) throw new OfflineRefusal('BILL_NOT_FOUND');
    const at = Date.now();
    const paid = { ...bill, paymentStatus: 'PAID', paidAt: toLocalIso(at), paidBy: this.user() };
    await this.enqueue({ id, kind: 'PAY_BILL', user: this.user(), url, body, at, meta: { salesCode: bill.salesCode, bill: paid } });
    return paid;
  }

  /**
   * Taking an item off an open bill, offline. A line the server already has
   * goes by its uid; one added offline (not on the server yet) goes by the op
   * that added it - sent after that op, the server finds it and still keeps
   * the record of who took what off and why.
   */
  async queueRemoveLine(url: string, body: any, id = this.newId()): Promise<any> {
    await this.requireOpenShift();
    if (!String(body?.reason ?? '').trim()) throw new OfflineRefusal('REASON_REQUIRED');
    let found: { bill: any; line: any } | null = null;
    for (const bill of await this.openBillsView()) {
      const line = (await this.billLinesView(bill.uid)).find((l) => l.uid === body.barSalesUID);
      if (line) {
        found = { bill, line };
        break;
      }
    }
    if (!found) throw new OfflineRefusal('BILL_NOT_FOUND');
    const { bill, line } = found;
    const max = Number(line.quantity) || 1;
    const qty = Math.min(Math.max(1, Number(body.quantity) || max), max);
    const unit = Number(line.price) || (Number(line.lineTotal) || 0) / max;
    const amount = qty === max ? Number(line.lineTotal ?? unit * max) : unit * qty;
    let send = { ...body, quantity: qty };
    const offlineLine = String(line.uid).match(/^offline-(.+)-(\d+)$/);
    if (offlineLine) {
      send = { addOpId: offlineLine[1], barServiceUID: line.barServiceUid, salesOpenedUID: bill.uid, quantity: qty, reason: body.reason };
    }
    await this.enqueue({
      id, kind: 'REMOVE_LINE', user: this.user(), url, body: send, at: Date.now(),
      meta: { billUid: bill.uid, lineUid: line.uid, qty, amount, salesCode: bill.salesCode },
    });
    return { ...bill, bill: Math.max(0, (Number(bill.bill) || 0) - amount) };
  }

  /** A staff member's handover shortage, offline - off their commission and this shift's expected cash once sent. */
  async queueStaffLoss(url: string, body: any, id = this.newId()): Promise<any> {
    await this.requireOpenShift();
    const loss = (Number(body?.expectedAmount) || 0) - (Number(body?.handedAmount) || 0);
    if (loss <= 0) throw new OfflineRefusal('NO_SHORTAGE');
    const staff = await this.staffByCode(String(body?.staffCode ?? ''));
    if (!staff) throw new OfflineRefusal('STAFF_NOT_CACHED');
    await this.enqueue({ id, kind: 'STAFF_LOSS', user: this.user(), url, body, at: Date.now(), meta: { staffName: staff.name, total: loss } });
    return { staffCode: staff.staffCode, staffName: staff.name, expectedAmount: body.expectedAmount, handedAmount: body.handedAmount, amount: loss, offline: true };
  }

  // ------------------------------------------------------------------
  // Staff Sell offline
  // ------------------------------------------------------------------

  private myDrafts(): any[] {
    return this.drafts().filter((d) => d.user === this.user());
  }

  private async saveDrafts(next: any[]): Promise<void> {
    this.drafts.set(next);
    await idbSet('drafts', next);
  }

  hasLocalDrafts(staffCode: string): boolean {
    return this.myDrafts().some((d) => d.staffCode === staffCode && d.lines.length);
  }

  /** Who a staff code is, from what the device has: an earlier lookup, or the staff list. */
  private async staffByCode(code: string): Promise<any | null> {
    const cached = (await this.recall<any>(`${BAR()}/staffSell/${encodeURIComponent(code)}`))?.data?.staff;
    if (cached) {
      return cached;
    }
    const list: any[] = (await this.recall<any>(`${BAR()}/findBarStaffList`))?.data ?? [];
    const s = list.find((x) => String(x.staffCode ?? '').toUpperCase() === code.toUpperCase());
    if (!s) {
      return null;
    }
    return { uid: s.uid, staffCode: s.staffCode, name: [s.firstName, s.lastName].filter(Boolean).join(' '), category: s.barCategory };
  }

  /** A staff member's bills and orders as Staff Sell shows them, offline. */
  async staffSellView(code: string): Promise<any | null> {
    const staff = await this.staffByCode(code);
    if (!staff) {
      return null;
    }
    const bills = (await this.openBillsView()).filter((b) => b.staffCode === staff.staffCode);
    const billUids = new Set(bills.map((b) => b.uid));
    const cachedOrders: any[] = ((await this.recall<any>(`${BAR()}/staffSell/${encodeURIComponent(code)}`))?.data?.orders ?? [])
      .filter((o: any) => billUids.has(o.salesOpenedUid));
    const local = this.myDrafts().filter((d) => billUids.has(d.salesOpenedUid) && d.lines.length);
    return { staff, bills, orders: [...cachedOrders, ...local] };
  }

  async queueStaffOpenBill(url: string, body: any, id = this.newId()): Promise<any> {
    await this.requireOpenShift();
    const staff = await this.staffByCode(String(body?.staffCode ?? ''));
    if (!staff) throw new OfflineRefusal('STAFF_NOT_CACHED');
    const held = new Set((await this.openBillsView()).map((b) => b.salesCode));
    let n = 1;
    while (held.has(`${staff.staffCode}-${n}`)) n++;
    const clientUid = body.clientUid ?? this.newId();
    const at = Date.now();
    const bill = {
      uid: clientUid, salesCode: `${staff.staffCode}-${n}`, staffUid: staff.uid, staffCode: staff.staffCode, staffName: staff.name,
      bill: 0, paidAmount: 0, paymentStatus: 'PENDING', status: 'ACTIVE', createdAt: toLocalIso(at).slice(0, 10), offline: true,
    };
    await this.enqueue({ id, kind: 'STAFF_OPEN_BILL', user: this.user(), url, body: { staffCode: staff.staffCode, clientUid }, at, meta: { bill } });
    return bill;
  }

  /** An item written at Staff Sell offline: onto this bill's local order, not sent yet. */
  async addStaffDraftItem(body: any): Promise<any> {
    await this.requireOpenShift();
    const bill = (await this.openBillsView()).find((b) => b.uid === body.salesOpenedUID);
    if (!bill) throw new OfflineRefusal('BILL_NOT_FOUND');
    const services: any[] = (await this.recall<any>(`${BAR()}/findBarServiceList`))?.data ?? [];
    const svc = services.find((s) => s.uid === body.barServiceUID);
    if (!svc || !svc.price) throw new OfflineRefusal('ITEM_NOT_CACHED');
    const drafts = [...this.drafts()];
    let draft = drafts.find((d) => d.user === this.user() && d.salesOpenedUid === bill.uid);
    if (!draft) {
      draft = {
        uid: `local-${this.newId()}`, user: this.user(), salesOpenedUid: bill.uid, salesCode: bill.salesCode, staffUid: bill.staffUid,
        staffCode: bill.staffCode, staffName: bill.staffName, status: 'DRAFT', lines: [], localDraft: true,
      };
      drafts.push(draft);
    } else {
      draft = { ...draft, lines: [...draft.lines] };
      drafts.splice(drafts.findIndex((d) => d.uid === draft.uid), 1, draft);
    }
    const quantity = Number(body.quantity) || 1;
    const same = draft.lines.findIndex((l: any) => l.barServiceUid === svc.uid);
    if (same >= 0) {
      draft.lines[same] = { ...draft.lines[same], quantity: draft.lines[same].quantity + quantity, unitPrice: svc.price };
    } else {
      draft.lines.push({ uid: `local-${this.newId()}`, barServiceUid: svc.uid, serviceName: svc.serviceName, quantity, unitPrice: svc.price });
    }
    await this.saveDrafts(drafts);
    return draft;
  }

  isLocalOrder(orderUid: string): boolean {
    return orderUid.startsWith('local-');
  }

  async removeDraftLine(orderUid: string, lineUid: string): Promise<any> {
    const drafts = [...this.drafts()];
    const i = drafts.findIndex((d) => d.uid === orderUid);
    if (i < 0) throw new OfflineRefusal('BILL_NOT_FOUND');
    const draft = { ...drafts[i], lines: drafts[i].lines.filter((l: any) => l.uid !== lineUid) };
    if (draft.lines.length) {
      drafts[i] = draft;
    } else {
      drafts.splice(i, 1);
    }
    await this.saveDrafts(drafts);
    return draft;
  }

  /**
   * Send at Staff Sell, offline: no supervisor can see it, so each bill's
   * written order goes straight onto the bill (queued as STAFF_ORDER); the
   * supervisor looks them over once they reach the server.
   */
  async sendStaffDrafts(staffCode: string): Promise<number> {
    const mine = this.myDrafts().filter((d) => d.staffCode === staffCode && d.lines.length);
    for (const d of mine) {
      const opId = this.newId();
      const lines = d.lines.map((l: any, i: number) => ({
        uid: `offline-${opId}-${i}`, barServiceUid: l.barServiceUid, serviceName: l.serviceName, quantity: l.quantity, price: l.unitPrice,
        lineTotal: l.unitPrice * l.quantity, firstName: d.staffName, salesCode: d.salesCode, offline: true,
      }));
      const total = lines.reduce((s: number, l: any) => s + l.lineTotal, 0);
      await this.enqueue({
        id: opId, kind: 'STAFF_ORDER', user: this.user(), url: `${BAR()}/staffOrders/offline`,
        body: { salesOpenedUID: d.salesOpenedUid, items: d.lines.map((l: any) => ({ barServiceUID: l.barServiceUid, quantity: l.quantity })) },
        at: Date.now(), meta: { lines, total, salesCode: d.salesCode },
      });
    }
    const sent = new Set(mine.map((d) => d.uid));
    await this.saveDrafts(this.drafts().filter((d) => !sent.has(d.uid)));
    if (this.online()) {
      this.sync();
    }
    return mine.reduce((n, d) => n + d.lines.length, 0);
  }

  // ---- Letting a manager out of Staff Sell with no server to ask ----

  /** After a manager's login opened Staff Sell online, keep a salted hash of it (never the password). */
  async rememberUnlock(username: string, password: string): Promise<void> {
    const salt = this.newId();
    const hash = await pbkdf2(password, salt);
    const list = ((await idbGet<any[]>('unlocks')) ?? []).filter((u) => u.username !== username.trim().toLowerCase());
    await idbSet('unlocks', [{ username: username.trim().toLowerCase(), salt, hash, at: Date.now() }, ...list].slice(0, 3));
  }

  async verifyUnlock(username: string, password: string): Promise<boolean> {
    const list = (await idbGet<any[]>('unlocks')) ?? [];
    const u = list.find((x) => x.username === String(username ?? '').trim().toLowerCase());
    return !!u && (await pbkdf2(String(password ?? ''), u.salt)) === u.hash;
  }

}

/** Local wall-clock ISO without a zone, the way the server sends LocalDateTime. */
export function toLocalIso(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** PBKDF2-SHA256 of a password, hex - WebCrypto, so it never leaves the device in the clear. */
async function pbkdf2(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
