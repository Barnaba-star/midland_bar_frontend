import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { silent } from '../../inteceptor/silent-request';
import { LiveChanges } from '../../services/live-changes';
import { Authentication } from '../../services/authentication';
import { Router } from '@angular/router';

interface TableCall { uid: string; tableName: string; kind: 'WAITER' | 'BILL' | 'PAID' | 'ORDER'; calledAt: string; note?: string; billUid?: string | null; billCode?: string | null; payMethod?: string | null; payRef?: string | null; payAmount?: number | null; staffUid?: string | null; staffName?: string | null; }
interface OrderLine { name: string; qty: number; price: number; serving?: 'COLD' | 'WARM' | null; }
interface TableOrder { uid: string; tableName: string; total: number; note?: string; placedAt: string; lines: OrderLine[]; billUid?: string | null; billCode?: string | null; staffName?: string | null; }
interface Waiter { uid: string; name: string; }

/**
 * What the tables want (customers' window, owner 2026-11-09): calls (waiter,
 * bill), "Nimelipa" to check, and orders to take for a waiter - with a chime
 * for each new one. Shown over POS and the counter screen.
 */
@Component({
  selector: 'app-table-calls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule],
  template: `
    @if (calls().length || orders().length) {
      <aside class="tc" role="status" aria-live="polite">
        @for (o of orders(); track o.uid) {
          <div class="tc-item order">
            <span class="tc-ico" aria-hidden="true">🛎️</span>
            <div class="tc-text">
              <strong>{{ o.tableName }} imeagiza · Tsh {{ o.total | number: '1.0-0' }}@if (o.billUid && o.staffName) { · ya {{ o.staffName }} }</strong>
              <span>@for (l of o.lines; track $index) { {{ l.qty }}× {{ l.name }}@if (l.serving) { ({{ l.serving === 'COLD' ? 'Baridi' : 'Moto' }})}@if (!$last) {, } } · {{ ago(o.placedAt) }}</span>
              @if (o.note) { <em>"{{ o.note }}"</em> }
              @if (taking() === o.uid) {
                <div class="tc-pick">
                  <select [(ngModel)]="waiterUid">
                    <option value="">Chagua mhudumu…</option>
                    @for (w of waiters(); track w.uid) { <option [value]="w.uid">{{ w.name }}</option> }
                  </select>
                  <button type="button" [disabled]="!waiterUid || busy()" (click)="accept(o)">Peleka</button>
                </div>
              }
              @if (rejecting() === o.uid) {
                <div class="tc-pick">
                  <input type="text" maxlength="200" [(ngModel)]="reason" placeholder="Sababu (mteja ataiona)" />
                  <button type="button" [disabled]="!reason.trim() || busy()" (click)="reject(o)">Kataa</button>
                </div>
              }
              @if (msg()[o.uid]) { <small class="tc-err">{{ msg()[o.uid] }}</small> }
            </div>
            <div class="tc-btns">
              <button type="button" (click)="startTake(o)">Pokea</button>
              <button type="button" class="ghost" (click)="startReject(o)">Kataa</button>
            </div>
          </div>
        }
        @for (c of calls(); track c.uid) {
          <div class="tc-item" [class.bill]="c.kind === 'BILL'" [class.paid]="c.kind === 'PAID'">
            <span class="tc-ico" aria-hidden="true">{{ c.kind === 'BILL' ? '🧾' : c.kind === 'PAID' ? '💳' : c.kind === 'ORDER' ? '🛎️' : '🙋' }}</span>
            <div class="tc-text">
              <strong>{{ c.tableName }}</strong>
              <!-- ORDER: from the bill's own QR, already sent to the counter / kitchen - the waiter takes it over. -->
              <span>{{ c.kind === 'BILL' ? 'inaomba bill' + (c.note ? ': ' + c.note : '') : c.kind === 'PAID' ? 'imelipa: ' + (c.note || '') : c.kind === 'ORDER' ? 'imeagiza (imeenda counter/jikoni): ' + (c.note || '') : c.staffName ? 'inamwita ' + c.staffName : 'inaita mhudumu' }} · {{ ago(c.calledAt) }}</span>
            </div>
            @if (c.kind === 'PAID' && canPay) {
              <!-- Lipa kwa simu (owner, 2026-11-11): check the ref on the bar's phone, then pay the bill or say why not. -->
              <div class="tc-acts">
                @if (c.billUid) {
                  <button type="button" (click)="confirmPaid(c)">Thibitisha</button>
                } @else {
                  <button type="button" (click)="done(c)">Nimehakiki</button>
                }
                <button type="button" class="ghost" (click)="startRejectPaid(c)">Kataa</button>
              </div>
            } @else {
              <button type="button" (click)="done(c)">{{ c.kind === 'PAID' ? 'Nimehakiki' : c.kind === 'ORDER' ? 'Sawa' : 'Nimeenda' }}</button>
            }
          </div>
          @if (rejectingPaid() === c.uid) {
            <div class="tc-reject">
              <input type="text" maxlength="200" [(ngModel)]="paidReason" placeholder="Sababu (mteja ataiona) - mf. hela haijaingia" />
              <button type="button" [disabled]="!paidReason.trim() || busy()" (click)="rejectPaid(c)">Kataa</button>
            </div>
          }
        }
      </aside>
    }
  `,
  styles: [`
    .tc { position: fixed; right: 16px; bottom: 16px; z-index: 1200; display: flex; flex-direction: column; gap: 8px; width: min(380px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-y: auto; }
    .tc-item { display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 14px; border-radius: 14px; background: #f5a524; color: #1a1206; box-shadow: 0 10px 30px rgba(0,0,0,.35); animation: tc-in .25s ease-out; }
    .tc-item.bill { background: #2b2118; color: #f6ecdc; border: 2px solid #f5a524; }
    .tc-item.paid { background: #1e5d32; color: #fff; }
    .tc-item.order { align-items: flex-start; background: #fff8ea; color: #1a1206; border: 2px solid #f5a524; }
    .tc-ico { font-size: 22px; }
    .tc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .tc-text strong { font-size: 15px; }
    .tc-text span, .tc-text em { font-size: 13px; opacity: .85; text-transform: none; }
    .tc-item button { flex: none; height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: #1a1206; color: #f6ecdc; font: inherit; font-weight: 700; cursor: pointer; }
    .tc-item.bill button { background: #f5a524; color: #1a1206; }
    .tc-item.paid button { background: #fff; color: #1e5d32; }
    .tc-item button.ghost { background: transparent; color: #c0392b; border: 1px solid #c0392b; }
    .tc-acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .tc-item button:disabled { opacity: .5; }
    .tc-btns { display: flex; flex-direction: column; gap: 6px; }
    .tc-pick { display: flex; gap: 6px; margin-top: 6px; }
    .tc-pick select, .tc-pick input { flex: 1; min-width: 0; height: 36px; padding: 0 8px; border: 1px solid #d8cdb9; border-radius: 8px; font: inherit; font-size: 14px; }
    .tc-err { color: #c0392b; font-weight: 700; }
    @keyframes tc-in { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `],
})
export class TableCalls {
  private readonly http = inject(HttpClient);
  /** A waiter signed in with code + PIN takes orders onto their own bill - no waiter to pick. */
  private readonly ownBill = inject(Authentication).isStaffSession();
  private readonly base = `${environment.baseApiUrl}/bar/tables`;
  readonly calls = signal<TableCall[]>([]);
  readonly orders = signal<TableOrder[]>([]);
  readonly waiters = signal<Waiter[]>([]);
  readonly taking = signal<string | null>(null);
  readonly rejecting = signal<string | null>(null);
  readonly busy = signal(false);
  readonly msg = signal<Record<string, string>>({});
  waiterUid = '';
  reason = '';
  private known = new Set<string>();
  private first = true;
  private audio: AudioContext | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.load();
    interval(20_000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.load());
    inject(LiveChanges).on('calls').pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.load());
  }

  private load(): void {
    this.http.get<{ data?: TableCall[] }>(`${this.base}/calls`, { context: silent() }).subscribe({
      next: (res) => { this.calls.set(res?.data ?? []); this.ring(); },
      error: () => {},
    });
    this.http.get<{ data?: TableOrder[] }>(`${this.base}/orders`, { context: silent() }).subscribe({
      next: (res) => { this.orders.set(res?.data ?? []); this.ring(); },
      error: () => {},
    });
  }

  /** A chime when something new arrived since the last look. */
  private ring(): void {
    const ids = [...this.calls().map((c) => c.uid), ...this.orders().map((o) => o.uid)];
    const fresh = ids.some((id) => !this.known.has(id));
    ids.forEach((id) => this.known.add(id));
    if (fresh && !this.first) this.chime();
    this.first = false;
  }

  private router = inject(Router);
  /** Who may take the money: the "Nimelipa" buttons (others just see it). */
  readonly canPay = inject(Authentication).hasPermission('SAVE_SALES');
  readonly rejectingPaid = signal<string | null>(null);
  paidReason = '';

  /** Opens the Pay dialog on Sales for that bill, filled from the customer's claim; paying it confirms the claim. */
  confirmPaid(c: TableCall): void {
    this.router.navigate(['/pos/barSales'], {
      queryParams: { payBill: c.billUid, claim: c.uid, method: c.payMethod || null, ref: c.payRef || null, amount: c.payAmount || null },
    });
  }

  startRejectPaid(c: TableCall): void {
    this.rejectingPaid.set(this.rejectingPaid() === c.uid ? null : c.uid);
    this.paidReason = '';
  }

  rejectPaid(c: TableCall): void {
    this.busy.set(true);
    this.http.post<{ data?: unknown; message?: string }>(`${this.base}/calls/${c.uid}/rejectPaid`, { reason: this.paidReason.trim() }, { context: silent() })
      .subscribe({
        next: () => { this.busy.set(false); this.rejectingPaid.set(null); this.load(); },
        error: () => { this.busy.set(false); this.load(); },
      });
  }

  done(c: TableCall): void {
    this.calls.set(this.calls().filter((x) => x.uid !== c.uid));
    this.http.post(`${this.base}/calls/${c.uid}/done`, {}, { context: silent() }).subscribe({ error: () => this.load() });
  }

  startTake(o: TableOrder): void {
    this.rejecting.set(null);
    // Ordered from a bill's own QR: it goes on that bill - no waiter to choose.
    if (this.ownBill || o.billUid) {
      this.waiterUid = '';
      this.accept(o);
      return;
    }
    this.taking.set(this.taking() === o.uid ? null : o.uid);
    this.waiterUid = '';
    if (!this.waiters().length) {
      this.http.get<{ data?: Waiter[] }>(`${environment.baseApiUrl}/bar/staffSell/colleagues`, { context: silent() })
        .subscribe((res) => this.waiters.set(res?.data ?? []));
    }
  }

  startReject(o: TableOrder): void {
    this.taking.set(null);
    this.rejecting.set(this.rejecting() === o.uid ? null : o.uid);
    this.reason = '';
  }

  accept(o: TableOrder): void {
    this.busy.set(true);
    this.http.post<{ data?: unknown; message?: string }>(`${this.base}/orders/${o.uid}/accept`, { staffUid: this.waiterUid }, { context: silent() })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          if (res?.data) { this.taking.set(null); this.load(); }
          else this.msg.set({ ...this.msg(), [o.uid]: res?.message || 'Haikufanikiwa' });
        },
        error: (e) => { this.busy.set(false); this.msg.set({ ...this.msg(), [o.uid]: e?.error?.message || 'Haikufanikiwa' }); },
      });
  }

  reject(o: TableOrder): void {
    this.busy.set(true);
    this.http.post<{ data?: unknown; message?: string }>(`${this.base}/orders/${o.uid}/reject`, { reason: this.reason.trim() }, { context: silent() })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          if (res?.data) { this.rejecting.set(null); this.load(); }
          else this.msg.set({ ...this.msg(), [o.uid]: res?.message || 'Haikufanikiwa' });
        },
        error: () => this.busy.set(false),
      });
  }

  ago(at: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    return mins < 1 ? 'sasa hivi' : `dk ${mins}`;
  }

  private chime(): void {
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      [0, 0.22].forEach((t, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = i ? 990 : 740;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.22);
      });
    } catch { /* no sound on this device */ }
  }
}
