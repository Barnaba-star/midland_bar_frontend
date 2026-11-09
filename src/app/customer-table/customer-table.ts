import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../Utils/enviroments/environment';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

interface MenuItem { name: string; price: number; category?: string | null; description?: string | null; available?: boolean; offerPrice?: number | null; offerName?: string | null; offerUntil?: string | null; }
interface Card { name?: string; lines: { label: string; value: string }[]; }
interface TableView { tableName: string; tableNumber: number; branchName?: string; menu: MenuItem[]; }

/** DRINK / FOOD / SHISHA / POOL as the customer reads them. */
const CATEGORY: Record<string, string> = { DRINK: 'Vinywaji', FOOD: 'Chakula', SHISHA: 'Shisha', POOL: 'Pool' };

/**
 * The customers' window (owner, 2026-11-09): what a phone opens after
 * scanning a table's QR card - no app, no login. The table token in the link
 * is the key; this shows the bar, the table and the menu with prices.
 * Ordering from here comes later.
 */
@Component({
  selector: 'app-customer-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, BrandWord],
  templateUrl: './customer-table.html',
  styleUrl: './customer-table.css',
})
export class CustomerTable {
  /**
   * A client with no interceptors: no login token is sent, so an old or
   * half-valid staff login on the phone can never turn the scan into a
   * sign-in page; no loader, popups or offline queue either - and it is quicker.
   */
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly view = signal<TableView | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing' | 'offline'>('loading');
  readonly search = signal('');
  readonly category = signal<string>('ALL');

  /** Calls to the bar: which one was just sent (the button rests a minute). */
  readonly called = signal<Record<string, boolean>>({});
  readonly sheet = signal<'none' | 'feedback' | 'card'>('none');
  readonly sending = signal(false);
  readonly notice = signal('');
  fbKind = 'PRAISE';
  fbRating = 0;
  fbMessage = '';
  fbName = '';
  fbPhone = '';
  cardPhone = '';
  cardPin = '';
  readonly card = signal<Card | null>(null);
  readonly cardError = signal('');
  readonly kinds = [
    { key: 'PRAISE', label: 'Pongezi' },
    { key: 'COMPLAINT', label: 'Malalamiko' },
    { key: 'QUESTION', label: 'Swali' },
    { key: 'ADVICE', label: 'Ushauri' },
  ];

  readonly categories = computed(() => {
    const seen = new Set((this.view()?.menu ?? []).map((m) => m.category || 'OTHER'));
    return ['DRINK', 'FOOD', 'SHISHA', 'POOL', 'OTHER'].filter((c) => seen.has(c));
  });

  readonly groups = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    const items = (this.view()?.menu ?? []).filter((m) =>
      (cat === 'ALL' || (m.category || 'OTHER') === cat) &&
      (!q || m.name.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q)));
    return this.categories()
      .map((c) => ({ key: c, label: this.label(c), items: items.filter((m) => (m.category || 'OTHER') === c) }))
      .filter((g) => g.items.length > 0);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.http.get<{ data?: TableView; message?: string }>(`${environment.baseApiUrl}/public/table/${encodeURIComponent(this.token)}`)
      .subscribe({
        next: (res) => {
          if (res?.data) {
            this.view.set(res.data);
            this.state.set('ready');
          } else {
            this.state.set('missing');
          }
        },
        error: () => this.state.set('offline'),
      });
  }

  private url(path = ''): string {
    return `${environment.baseApiUrl}/public/table/${encodeURIComponent(this.token)}${path}`;
  }

  private flash(text: string): void {
    this.notice.set(text);
    setTimeout(() => this.notice.set(''), 4000);
  }

  /** WAITER or BILL: the bar sees it at once; the button rests a minute. */
  call(kind: 'WAITER' | 'BILL'): void {
    if (this.called()[kind]) return;
    this.http.post<{ data?: unknown; message?: string }>(this.url('/call'), { kind }).subscribe({
      next: (res) => {
        if (res?.data) {
          this.called.set({ ...this.called(), [kind]: true });
          setTimeout(() => this.called.set({ ...this.called(), [kind]: false }), 60_000);
          this.flash(kind === 'WAITER' ? 'Mhudumu amejulishwa - anakuja.' : 'Bill yako inaandaliwa - mhudumu ataileta.');
        } else {
          this.flash(res?.message === 'TOO_SOON' ? 'Tayari umeita - subiri kidogo.' : 'Haikufanikiwa, jaribu tena.');
        }
      },
      error: () => this.flash('Hakuna mtandao - jaribu tena.'),
    });
  }

  openSheet(which: 'feedback' | 'card'): void {
    this.sheet.set(which);
  }

  sendFeedback(): void {
    const message = this.fbMessage.trim();
    if (message.length < 2 || this.sending()) return;
    this.sending.set(true);
    this.http.post<{ data?: unknown; message?: string }>(this.url('/feedback'), {
      kind: this.fbKind, message, rating: this.fbRating || null,
      name: this.fbName.trim() || null, phone: this.fbPhone.trim() || null,
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.data) {
          this.sheet.set('none');
          this.fbMessage = '';
          this.fbRating = 0;
          this.flash('Asante! Ujumbe wako umemfikia meneja.');
        } else {
          this.flash(res?.message === 'TOO_MANY' ? 'Umetuma mara nyingi - jaribu baadaye.' : 'Haikufanikiwa, jaribu tena.');
        }
      },
      error: () => {
        this.sending.set(false);
        this.flash('Hakuna mtandao - jaribu tena.');
      },
    });
  }

  checkCard(): void {
    if (!this.cardPhone.trim() || !this.cardPin.trim() || this.sending()) return;
    this.sending.set(true);
    this.cardError.set('');
    this.http.post<{ data?: Card; message?: string }>(this.url('/card'), { phone: this.cardPhone.trim(), pin: this.cardPin.trim() }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.cardPin = '';
        if (res?.data) this.card.set(res.data);
        else this.cardError.set(res?.message === 'TOO_MANY_ATTEMPTS' ? 'Umekosea mara nyingi - jaribu baada ya dakika 15.' : 'Namba au PIN si sahihi.');
      },
      error: () => {
        this.sending.set(false);
        this.cardError.set('Hakuna mtandao - jaribu tena.');
      },
    });
  }

  label(c: string): string {
    return CATEGORY[c] ?? 'Mengineyo';
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
}
