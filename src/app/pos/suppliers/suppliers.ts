import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { Authentication } from '../../Utils/services/authentication';
import { PAYMENT_METHODS } from '../../Utils/component/dialogs/pay-bill-dialog-component/pay-bill-dialog-component';
import { SystemSettingService } from '../../Utils/services/system-setting';
import { UploadedImageService } from '../../Utils/services/uploaded-image';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

type Tab = 'SUPPLIERS' | 'ORDERS' | 'BUDGET' | 'PRICES';

/**
 * POS > Wasambazaji: who the bar buys from and what is owed to each, purchase
 * orders and receiving against them (the store goes up), paying a supplier,
 * and what each product was bought at over time.
 */
@Component({
  selector: 'app-suppliers',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './suppliers.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Suppliers implements OnInit {
  private bar = inject(ServiceBarMethod);
  private auth = inject(Authentication);
  private cdr = inject(ChangeDetectorRef);
  private settings = inject(SystemSettingService);
  private images = inject(UploadedImageService);

  readonly canManage = this.auth.hasPermission('MANAGE_SUPPLIERS');
  readonly canReceive = this.auth.hasPermission('SAVE_STORE');
  readonly methods = PAYMENT_METHODS;
  tab: Tab = 'SUPPLIERS';
  busy = false;

  suppliers: any[] = [];
  /** Each product's Manunuzi budget, by service uid. */
  budget: Record<string, any> = {};
  budgetRows: any[] = [];
  orders: any[] = [];
  products: any[] = [];

  /** The open panel. */
  supplierForm: any = null;
  paying: any = null;
  ledger: any = null;
  orderForm: any = null;
  order: any = null;
  receiving: Record<string, number | null> = {};
  priceProduct = '';
  prices: any[] = [];

  ngOnInit(): void {
    this.load();
    this.bar.findBarServiceList().subscribe((res: any) => {
      this.products = (res?.data ?? []).filter((s: any) => s.trackStock && s.kind !== 'STOCK_ITEM')
        .sort((a: any, b: any) => (a.serviceName ?? '').localeCompare(b.serviceName ?? ''));
      this.cdr.markForCheck();
    });
  }

  load(): void {
    this.bar.findSuppliers().subscribe((r) => { this.suppliers = r?.data ?? []; this.cdr.markForCheck(); });
    this.bar.findPurchaseOrders().subscribe((r) => { this.orders = r?.data ?? []; this.cdr.markForCheck(); });
    this.bar.findManunuziBudget().subscribe((r) => {
      this.budgetRows = r?.data ?? [];
      this.budget = {};
      for (const b of this.budgetRows) this.budget[b.serviceUid] = b;
      this.cdr.markForCheck();
    });
  }

  get openOrders(): number {
    return this.orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL').length;
  }

  get owedTotal(): number {
    return this.suppliers.reduce((s, x) => s + Math.max(0, Number(x.owed) || 0), 0);
  }

  private done<T>(obs: any, after: (d: any) => void): void {
    if (this.busy) return;
    this.busy = true;
    obs.subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.data) after(res.data);
        this.cdr.markForCheck();
      },
      error: () => { this.busy = false; this.cdr.markForCheck(); },
    });
  }

  // suppliers
  newSupplier(): void { this.closeAll(); this.supplierForm = { name: '', phone: '', contactPerson: '', note: '' }; }
  editSupplier(s: any): void { this.closeAll(); this.supplierForm = { ...s }; }
  saveSupplier(): void {
    const f = this.supplierForm;
    this.done(this.bar.saveSupplier(f, f.uid), () => { this.supplierForm = null; this.load(); });
  }
  openLedger(s: any): void {
    this.closeAll();
    this.bar.findSupplierLedger(s.uid).subscribe((r) => { this.ledger = r?.data ?? null; this.cdr.markForCheck(); });
  }
  startPay(s: any): void { this.closeAll(); this.paying = { supplierUid: s.uid, name: s.name, owed: s.owed, amount: s.owed, method: 'cash', fromDrawer: true, note: '' }; }
  pay(): void {
    const p = this.paying;
    this.done(this.bar.paySupplier({ supplierUid: p.supplierUid, amount: p.amount, method: p.method, fromDrawer: p.fromDrawer, note: p.note }),
      () => { this.paying = null; this.load(); });
  }

  // orders
  newOrder(): void {
    this.closeAll();
    // Every product comes already filled with as many packs as its Manunuzi
    // allows (owner, 2026-10-19), so the owner only lowers or removes lines.
    const lines = this.products
      .map((p) => ({ serviceUid: p.uid, packs: this.maxPacks(p.uid, Number(p.buyingPrice) || 0), packPrice: p.buyingPrice ?? null }))
      .filter((l) => l.packs > 0);
    this.orderForm = { supplierUid: this.suppliers[0]?.uid ?? '', expectedOn: '', note: '', allowOverBudget: false,
      lines: lines.length ? lines : [{ serviceUid: '', packs: 1, packPrice: null }] };
  }
  /**
   * The packs a product's free Manunuzi allows, rounded up to a whole pack:
   * anything sold since it was last bought brings it in (one beer sold - one
   * crate to replace it).
   */
  private maxPacks(serviceUid: string, packPrice: number): number {
    const free = this.available(serviceUid);
    return packPrice > 0 && free > 0 ? Math.ceil(free / packPrice) : 0;
  }
  addLine(): void { this.orderForm.lines.push({ serviceUid: '', packs: 1, packPrice: null }); }
  removeLine(i: number): void { this.orderForm.lines.splice(i, 1); }
  pickProduct(l: any): void {
    const p = this.products.find((x) => x.uid === l.serviceUid);
    if (p && !l.packPrice) l.packPrice = p.buyingPrice ?? null;
    if (p) l.packs = this.maxPacks(p.uid, Number(l.packPrice) || 0) || 1;
  }
  /** Free Manunuzi for a product, less what this order's other lines for it already take. */
  available(serviceUid: string): number {
    return Number(this.budget[serviceUid]?.available ?? 0);
  }

  /** A line beyond its Manunuzi by a whole pack or more. */
  overLine(l: any): boolean {
    const value = (Number(l.packs) || 0) * (Number(l.packPrice) || 0);
    const free = this.available(l.serviceUid);
    return value > free && (free <= 0 || value - free >= (Number(l.packPrice) || 0));
  }

  /** The order's value per product above what its Manunuzi allows. */
  get overBudget(): { name: string; value: number; free: number }[] {
    const by = new Map<string, number>();
    const pack = new Map<string, number>();
    for (const l of this.orderForm?.lines ?? []) {
      if (!l.serviceUid) continue;
      by.set(l.serviceUid, (by.get(l.serviceUid) ?? 0) + (Number(l.packs) || 0) * (Number(l.packPrice) || 0));
      pack.set(l.serviceUid, Math.max(pack.get(l.serviceUid) ?? 0, Number(l.packPrice) || 0));
    }
    const out: { name: string; value: number; free: number }[] = [];
    by.forEach((value, uid) => {
      const free = this.available(uid);
      // Up to the whole pack that the savings have started on is allowed.
      if (value > free && (free <= 0 || value - free >= (pack.get(uid) ?? 0))) out.push({ name: this.budget[uid]?.serviceName ?? '', value, free: Math.max(0, free) });
    });
    return out;
  }

  get orderTotal(): number {
    return (this.orderForm?.lines ?? []).reduce((s: number, l: any) => s + (Number(l.packs) || 0) * (Number(l.packPrice) || 0), 0);
  }
  /** Places the order; with [print], prints it for the supplier once it is saved. */
  saveOrder(print = false): void {
    const f = this.orderForm;
    const body = { ...f, expectedOn: f.expectedOn || null, lines: f.lines.filter((l: any) => l.serviceUid && Number(l.packs) > 0) };
    this.done(this.bar.createPurchaseOrder(body), (d) => { this.orderForm = null; this.load(); this.openOrder(d, print); });
  }
  openOrder(o: any, print = false): void {
    this.closeAll();
    this.bar.findPurchaseOrder(o.uid).subscribe((r) => {
      this.order = r?.data ?? null;
      if (print && this.order) this.printOrder();
      this.receiving = {};
      for (const l of this.order?.lines ?? []) this.receiving[l.uid] = Math.max(0, l.packs - l.receivedPacks) || null;
      this.cdr.markForCheck();
    });
  }
  receive(): void {
    const lines = Object.entries(this.receiving).filter(([, n]) => (Number(n) || 0) > 0).map(([lineUid, packs]) => ({ lineUid, packs }));
    this.done(this.bar.receivePurchaseOrder(this.order.uid, { lines }), (d) => { this.load(); this.openOrder(d); });
  }
  cancelOrder(): void {
    this.done(this.bar.cancelPurchaseOrder(this.order.uid), () => { this.order = null; this.load(); });
  }

  /**
   * Prints the order on the 58mm roll (owner, 2026-10-19): the bar, the
   * supplier, and each product with its packs and price, to hand over or
   * send to the supplier.
   */
  async printOrder(): Promise<void> {
    const o = this.order;
    if (!o) return;
    const setting = await firstValueFrom(this.settings.getLogo().pipe(catchError(() => of(null))));
    const logo = await firstValueFrom(this.images.load(setting?.data?.logoImage).pipe(catchError(() => of(null))))
      .catch(() => null);
    const sup = this.suppliers.find((s) => s.uid === o.supplierUid);
    const e = (t: any) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const n = (v: any) => (Number(v) || 0).toLocaleString('en-US');
    const day = (v: any) => (v ? new Date(v).toLocaleDateString('en-GB') : '');
    const rows = (o.lines ?? []).map((l: any) => `
      <div>${e(l.serviceName)}</div>
      <div class="row sub"><span>${n(l.packs)} x ${n(l.packPrice)}</span><span>${n(l.packs * l.packPrice)}</span></div>`).join('');
    const total = (o.lines ?? []).reduce((s: number, l: any) => s + (Number(l.packs) || 0) * (Number(l.packPrice) || 0), 0);
    const html = `
      <img class="logo" src="${e(logo || location.origin + '/assets/images/baronix-receipt-logo.png')}" alt="" />
      <div class="c b big">${e(setting?.data?.companyName || 'BaronixTZ')}</div>
      <div class="c b">ORDER YA MANUNUZI</div>
      <div class="c">${e(o.code)}</div>
      <div class="rule"></div>
      <div class="row"><span>MSAMBAZAJI</span><span class="b">${e(o.supplierName ?? sup?.name)}</span></div>
      ${sup?.phone ? `<div class="row"><span>SIMU</span><span>${e(sup.phone)}</span></div>` : ''}
      ${sup?.contactPerson ? `<div class="row"><span>MHUSIKA</span><span>${e(sup.contactPerson)}</span></div>` : ''}
      <div class="row"><span>TAREHE</span><span>${day(o.orderedAt || new Date())}</span></div>
      ${o.expectedOn ? `<div class="row"><span>ILETWE</span><span>${day(o.expectedOn)}</span></div>` : ''}
      <div class="rule"></div>
      <div class="row b"><span>BIDHAA (PAKITI x BEI)</span><span>JUMLA</span></div>
      ${rows}
      <div class="rule"></div>
      <div class="row b big"><span>JUMLA</span><span>Tshs ${n(total)}</span></div>
      ${o.note ? `<div class="rule"></div><div>${e(o.note)}</div>` : ''}
      <div class="rule"></div>
      <div>SAHIHI: ____________________</div>`;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:58mm;height:10px;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const win = frame.contentWindow;
    if (!win) { frame.remove(); return; }
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>${e(o.code)}</title><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; }
      body { font-family: 'Courier New', monospace; font-size: calc(100vw * 12 / 219); color: #000; text-transform: uppercase; }
      .paper { padding: 5.2vw 3.5vw; }
      .logo { display: block; margin: 0 auto 3vw; max-width: 40vw; max-height: 31vw; object-fit: contain; filter: grayscale(1) contrast(1.3); }
      .c { text-align: center; } .b { font-weight: 700; } .big { font-size: 1.25em; }
      .row { display: flex; justify-content: space-between; gap: 0.667em; }
      .sub { padding-left: 0.833em; }
      .rule { border-top: 1px dashed #000; margin: 0.5em 0; }
    </style><style id="page-size"></style></head><body><div class="paper">${html}</div></body></html>`);
    win.document.close();
    await Promise.all(Array.from(win.document.images).map((img) => img.complete ? Promise.resolve()
      : new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => { img.remove(); resolve(); }; setTimeout(resolve, 2500); })));
    const tall = win.document.querySelector<HTMLElement>('.paper')?.offsetHeight ?? 0;
    const handheld = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    win.document.getElementById('page-size')!.textContent = handheld
      ? '@page { margin: 0; }'
      : `@page { size: 58mm ${Math.max(Math.ceil(tall * 25.4 / 96) + 4, 70)}mm; margin: 0; }`;
    win.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500), { once: true });
    win.focus();
    win.print();
    setTimeout(() => frame.isConnected && frame.remove(), 60000);
  }

  // prices
  loadPrices(): void {
    if (!this.priceProduct) { this.prices = []; return; }
    this.bar.findPurchasePrices(this.priceProduct).subscribe((r) => { this.prices = r?.data ?? []; this.cdr.markForCheck(); });
  }

  closeAll(): void {
    this.supplierForm = this.paying = this.ledger = this.orderForm = this.order = null;
  }
}
