import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../Utils/enviroments/environment';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

interface MenuItem { uid: string; name: string; price: number; category?: string | null; description?: string | null; available?: boolean; offerPrice?: number | null; offerName?: string | null; }
interface Info { wifiName?: string; wifiPassword?: string; hours?: string; phone?: string; note?: string; payMpesa?: string; payTigo?: string; payAirtel?: string; payHalo?: string; payBank?: string; }
interface TableView { tableName: string; tableNumber: number; branchName?: string; menu: MenuItem[]; info?: Info; }
interface Card { name?: string; lines: { label: string; value: string }[]; }
interface OrderLine { name: string; qty: number; price: number; serving?: Serving | null; }
type Serving = 'COLD' | 'WARM';
/** Asked baridi / moto like the waiters' picker: everything but food, shisha, pool and juice. */
const NO_SERVING = ['FOOD', 'SHISHA', 'POOL', 'JUICE'];
interface TableOrder { uid: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; total: number; lines: OrderLine[]; staffName?: string; rejectReason?: string; }

type Lang = 'sw' | 'en';
/** The window's own words in Swahili and English (owner, 2026-11-09: visitors and tourists). */
const T: Record<string, [string, string]> = {
  loading: ['Inafungua menyu…', 'Opening the menu…'],
  deadTitle: ['Kadi hii haifanyi kazi', 'This card no longer works'],
  deadText: ['QR hii imebadilishwa au meza imeondolewa. Mwombe mhudumu akusaidie.', 'This QR was replaced or the table removed. Please ask a waiter.'],
  offTitle: ['Hakuna mtandao', 'No connection'],
  offText: ['Hatukuweza kufungua menyu. Hakikisha una internet kisha jaribu tena.', 'Could not open the menu. Check your internet and try again.'],
  retry: ['Jaribu tena', 'Try again'],
  welcome: ['Karibu', 'Welcome'],
  youAt: ['Uko', 'You are at'],
  sub: ['Angalia menyu, agiza, au mwite mhudumu.', 'See the menu, order, or call a waiter.'],
  yourWaiter: ['Mhudumu wako', 'Your waiter'],
  callWaiter: ['Mwite mhudumu', 'Call waiter'], called: ['Ameitwa', 'Called'],
  askBill: ['Omba bill', 'Ask for bill'], billAsked: ['Imeombwa', 'Requested'],
  pay: ['Lipa', 'Pay'], feedback: ['Toa maoni', 'Feedback'], points: ['Pointi zangu', 'My points'],
  search: ['Tafuta kinywaji au chakula', 'Search drinks or food'], all: ['Zote', 'All'],
  soldOut: ['Kimeisha', 'Sold out'], offer: ['Ofa', 'Offer'], add: ['Ongeza', 'Add'],
  none: ['Menyu bado haijawekwa.', 'The menu is not set up yet.'], noMatch: ['Hakuna kinacholingana.', 'Nothing matches.'],
  cart: ['Agiza', 'Order'], cartTitle: ['Oda yako', 'Your order'], note: ['Maelezo (si lazima), mfano "baridi sana"', 'Note (optional), e.g. "very cold"'],
  cold: ['Baridi', 'Cold'], warm: ['Moto', 'Warm'],
  sendOrder: ['Tuma oda', 'Send order'], sending: ['Inatuma…', 'Sending…'], total: ['Jumla', 'Total'],
  myOrders: ['Oda zako', 'Your orders'], stPending: ['Inasubiri kupokelewa', 'Waiting to be taken'],
  stAccepted: ['Imepokelewa', 'Taken'], stRejected: ['Imekataliwa', 'Declined'], by: ['na', 'by'],
  orderSent: ['Oda imetumwa - mhudumu ataipokea sasa hivi.', 'Order sent - a waiter will take it now.'],
  waiterOk: ['Mhudumu amejulishwa - anakuja.', 'A waiter is on the way.'],
  billOk: ['Bill yako inaandaliwa - mhudumu ataileta.', 'Your bill is being prepared.'],
  tooSoon: ['Tayari umeita - subiri kidogo.', 'Already called - please wait a moment.'],
  failed: ['Haikufanikiwa, jaribu tena.', 'That did not work, try again.'], offline: ['Hakuna mtandao - jaribu tena.', 'No connection - try again.'],
  tooMany: ['Umetuma mara nyingi - jaribu baadaye.', 'Too many tries - try later.'],
  info: ['Taarifa', 'Info'], wifi: ['WiFi', 'WiFi'], password: ['Password', 'Password'], hours: ['Saa', 'Hours'], phone: ['Simu', 'Phone'],
  payTitle: ['Lipa bar moja kwa moja', 'Pay the bar directly'],
  payText: ['Lipa kwa namba hizi, kisha bonyeza "Nimelipa" ili cashier ahakiki.', 'Pay to these numbers, then tap "I have paid" so the cashier can check.'],
  noPay: ['Bar hii bado haijaweka namba za malipo - mwombe mhudumu.', 'This bar has not set payment numbers yet - ask a waiter.'],
  method: ['Njia', 'Method'], name: ['Jina', 'Name'], ref: ['Kumbukumbu ya muamala (ref)', 'Transaction reference'], amount: ['Kiasi (Tsh)', 'Amount (Tsh)'],
  iPaid: ['Nimelipa', 'I have paid'], paidOk: ['Asante! Cashier atahakiki malipo yako.', 'Thank you! The cashier will check your payment.'],
  fbTitle: ['Toa maoni', 'Feedback'], fbText: ['Ujumbe wako unamfikia meneja moja kwa moja.', 'Your message goes straight to the manager.'],
  praise: ['Pongezi', 'Praise'], complaint: ['Malalamiko', 'Complaint'], question: ['Swali', 'Question'], advice: ['Ushauri', 'Advice'],
  service: ['Huduma', 'Service'], rateWaiter: ['Mpime', 'Rate'], write: ['Andika hapa…', 'Write here…'],
  nameOpt: ['Jina (si lazima)', 'Name (optional)'], phoneOpt: ['Simu (si lazima)', 'Phone (optional)'], send: ['Tuma', 'Send'],
  fbOk: ['Asante! Ujumbe wako umemfikia meneja.', 'Thank you! Your message reached the manager.'],
  cardTitle: ['Pointi zangu', 'My points'], cardText: ['Weka namba ya simu na PIN uliyosajiliwa nayo bar hii.', 'Enter the phone number and PIN you registered with this bar.'],
  phoneNo: ['Namba ya simu', 'Phone number'], check: ['Angalia', 'Check'], checking: ['Inaangalia…', 'Checking…'],
  hello: ['Karibu', 'Hello'], other: ['Angalia namba nyingine', 'Check another number'],
  badPin: ['Namba au PIN si sahihi.', 'Wrong number or PIN.'], locked: ['Umekosea mara nyingi - jaribu baada ya dakika 15.', 'Too many wrong tries - try again in 15 minutes.'],
  close: ['Funga', 'Close'],
};
const CATEGORY: Record<string, [string, string]> = { DRINK: ['Vinywaji', 'Drinks'], FOOD: ['Chakula', 'Food'], SHISHA: ['Shisha', 'Shisha'], POOL: ['Pool', 'Pool'], JUICE: ['Juisi', 'Juice'] };

/**
 * The customers' window (owner, 2026-11-09): what a phone opens after
 * scanning a table's QR card - no app, no login, the table token is the key.
 * Menu with prices, sold-out and offers; order (a waiter takes it); call the
 * waiter or ask for the bill; pay the bar's own numbers and say so; feedback;
 * points; the bar's info; Swahili or English.
 */
@Component({
  selector: 'app-customer-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormsModule, BrandWord],
  templateUrl: './customer-table.html',
  styleUrl: './customer-table.css',
})
export class CustomerTable {
  /** No interceptors: no login token, no sign-in redirect, no loader - and quicker. */
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly lang = signal<Lang>(this.savedLang());
  readonly view = signal<TableView | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing' | 'offline'>('loading');
  readonly search = signal('');
  readonly category = signal<string>('ALL');
  readonly called = signal<Record<string, boolean>>({});
  readonly sheet = signal<'none' | 'feedback' | 'card' | 'cart' | 'pay'>('none');
  readonly sending = signal(false);
  readonly notice = signal('');
  readonly cart = signal<Record<string, number>>({});
  readonly orders = signal<TableOrder[]>([]);
  readonly waiter = signal<string | null>(null);
  readonly card = signal<Card | null>(null);
  readonly cardError = signal('');
  orderNote = '';
  fbKind = 'PRAISE';
  fbRating = 0;
  fbMessage = '';
  fbName = '';
  fbPhone = '';
  cardPhone = '';
  cardPin = '';
  payMethod = '';
  payName = '';
  payRef = '';
  payAmount = '';
  readonly kinds = ['PRAISE', 'COMPLAINT', 'QUESTION', 'ADVICE'];
  private ordersTimer: ReturnType<typeof setInterval> | null = null;

  readonly categories = computed(() => {
    const seen = new Set((this.view()?.menu ?? []).map((m) => m.category || 'OTHER'));
    return ['DRINK', 'FOOD', 'JUICE', 'SHISHA', 'POOL', 'OTHER'].filter((c) => seen.has(c));
  });

  readonly groups = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    const items = (this.view()?.menu ?? []).filter((m) =>
      (cat === 'ALL' || (m.category || 'OTHER') === cat) &&
      (!q || m.name.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q)));
    return this.categories()
      .map((c) => ({ key: c, items: items.filter((m) => (m.category || 'OTHER') === c) }))
      .filter((g) => g.items.length > 0);
  });

  readonly cartLines = computed(() => {
    const menu = new Map((this.view()?.menu ?? []).map((m) => [m.uid, m]));
    return Object.entries(this.cart()).filter(([, q]) => q > 0)
      .map(([key, qty]) => {
        const [uid, s] = key.split('|');
        return { key, item: menu.get(uid)!, qty, serving: (s || null) as Serving | null };
      }).filter((l) => !!l.item);
  });
  readonly cartCount = computed(() => this.cartLines().reduce((n, l) => n + l.qty, 0));
  readonly cartTotal = computed(() => this.cartLines().reduce((n, l) => n + l.qty * this.unit(l.item), 0));

  readonly payNumbers = computed(() => {
    const i = this.view()?.info ?? {};
    return ([['M-Pesa', i.payMpesa], ['Tigo Pesa', i.payTigo], ['Airtel Money', i.payAirtel], ['HaloPesa', i.payHalo], ['Benki', i.payBank]] as [string, string | undefined][])
      .filter(([, v]) => !!v && v.trim()).map(([k, v]) => ({ method: k, number: v! }));
  });

  constructor() {
    this.load();
    this.loadOrders();
    this.ordersTimer = setInterval(() => this.loadOrders(), 20_000);
    inject(DestroyRef).onDestroy(() => this.ordersTimer && clearInterval(this.ordersTimer));
  }

  t(key: string): string {
    const pair = T[key];
    return pair ? pair[this.lang() === 'en' ? 1 : 0] : key;
  }

  label(c: string): string {
    const pair = CATEGORY[c];
    return pair ? pair[this.lang() === 'en' ? 1 : 0] : (this.lang() === 'en' ? 'Other' : 'Mengineyo');
  }

  kindLabel(k: string): string {
    return this.t(k.toLowerCase());
  }

  setLang(l: Lang): void {
    this.lang.set(l);
    try { localStorage.setItem('meza.lang', l); } catch { /* private mode */ }
  }

  private savedLang(): Lang {
    try { return localStorage.getItem('meza.lang') === 'en' ? 'en' : 'sw'; } catch { return 'sw'; }
  }

  private url(path = ''): string {
    return `${environment.baseApiUrl}/public/table/${encodeURIComponent(this.token)}${path}`;
  }

  load(): void {
    this.state.set('loading');
    this.http.get<{ data?: TableView }>(this.url()).subscribe({
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

  private loadOrders(): void {
    this.http.get<{ data?: { orders: TableOrder[]; waiter?: string } }>(this.url('/orders')).subscribe({
      next: (res) => {
        if (!res?.data) return;
        this.orders.set(res.data.orders ?? []);
        this.waiter.set(res.data.waiter ?? null);
      },
      error: () => {},
    });
  }

  unit(m: MenuItem): number {
    return m.offerPrice ?? m.price;
  }

  readonly servings: Serving[] = ['COLD', 'WARM'];

  /** A drink: the customer says baridi or moto right on it (owner, 2026-11-09). */
  asksServing(m: MenuItem): boolean {
    return !NO_SERVING.includes((m.category || '').toUpperCase());
  }

  /** Cart key: the item, and baridi / moto for a drink - 2 cold and 1 warm stay apart. */
  key(m: MenuItem, s: Serving | null = null): string {
    return m.uid + '|' + (s ?? '');
  }

  servingLabel(s?: Serving | null): string {
    return s === 'COLD' ? this.t('cold') : s === 'WARM' ? this.t('warm') : '';
  }

  qty(key: string): number {
    return this.cart()[key] ?? 0;
  }

  change(key: string, by: number): void {
    const next = Math.max(0, Math.min(20, this.qty(key) + by));
    this.cart.set({ ...this.cart(), [key]: next });
  }

  private flash(key: string): void {
    this.notice.set(this.t(key));
    setTimeout(() => this.notice.set(''), 4000);
  }

  call(kind: 'WAITER' | 'BILL'): void {
    if (this.called()[kind]) return;
    this.http.post<{ data?: unknown; message?: string }>(this.url('/call'), { kind }).subscribe({
      next: (res) => {
        if (res?.data) {
          this.called.set({ ...this.called(), [kind]: true });
          setTimeout(() => this.called.set({ ...this.called(), [kind]: false }), 60_000);
          this.flash(kind === 'WAITER' ? 'waiterOk' : 'billOk');
        } else {
          this.flash(res?.message === 'TOO_SOON' ? 'tooSoon' : 'failed');
        }
      },
      error: () => this.flash('offline'),
    });
  }

  openSheet(which: 'feedback' | 'card' | 'cart' | 'pay'): void {
    if (which === 'pay' && !this.payMethod) this.payMethod = this.payNumbers()[0]?.method ?? 'M-Pesa';
    this.sheet.set(which);
  }

  sendOrder(): void {
    const items = this.cartLines().map((l) => ({ uid: l.item.uid, qty: l.qty, serving: l.serving }));
    if (!items.length || this.sending()) return;
    this.sending.set(true);
    this.http.post<{ data?: unknown; message?: string }>(this.url('/order'), { items, note: this.orderNote.trim() || null }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.data) {
          this.cart.set({});
          this.orderNote = '';
          this.sheet.set('none');
          this.flash('orderSent');
          this.loadOrders();
        } else {
          this.flash(res?.message === 'TOO_MANY' ? 'tooMany' : 'failed');
        }
      },
      error: () => { this.sending.set(false); this.flash('offline'); },
    });
  }

  sendPaid(): void {
    if ((!this.payName.trim() && !this.payRef.trim()) || this.sending()) return;
    this.sending.set(true);
    this.http.post<{ data?: unknown; message?: string }>(this.url('/paid'), {
      method: this.payMethod, name: this.payName.trim() || null, ref: this.payRef.trim() || null, amount: this.payAmount.trim() || null,
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.data) {
          this.sheet.set('none');
          this.payRef = '';
          this.payAmount = '';
          this.flash('paidOk');
        } else {
          this.flash(res?.message === 'TOO_SOON' ? 'tooSoon' : 'failed');
        }
      },
      error: () => { this.sending.set(false); this.flash('offline'); },
    });
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
          this.flash('fbOk');
        } else {
          this.flash(res?.message === 'TOO_MANY' ? 'tooMany' : 'failed');
        }
      },
      error: () => { this.sending.set(false); this.flash('offline'); },
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
        else this.cardError.set(this.t(res?.message === 'TOO_MANY_ATTEMPTS' ? 'locked' : 'badPin'));
      },
      error: () => { this.sending.set(false); this.cardError.set(this.t('offline')); },
    });
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
}
