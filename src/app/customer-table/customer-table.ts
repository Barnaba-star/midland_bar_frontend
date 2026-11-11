import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../Utils/enviroments/environment';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

interface MenuItem { uid: string; name: string; price: number; category?: string | null; description?: string | null; available?: boolean; offerPrice?: number | null; offerName?: string | null; }
interface Info { wifiName?: string; wifiPassword?: string; hours?: string; phone?: string; note?: string; payMpesa?: string; payTigo?: string; payAirtel?: string; payHalo?: string; payBank?: string; }
interface TableView { tableName: string; tableNumber: number; branchName?: string; menu: MenuItem[]; info?: Info; bill?: { code: string; staffName?: string | null; open: boolean } | null; }
interface BillCopy { code: string; staffName?: string; status: 'PENDING' | 'PAID' | string; lines: { name: string; qty: number; price: number; total: number; offer?: string | null }[]; total: number; paid: number; toPay: number; }
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
  billTitle: ['Bill yako', 'Your bill'], free: ['Bure', 'Free'],
  yourBill: ['Bill yako', 'Your bill'], billSub: ['Agiza zaidi hapa - inaingia kwenye bill yako na kwa mhudumu wako.', 'Order more here - it goes on your bill and to your waiter.'],
  billClosed: ['Bill hii imelipwa - asante! Kuagiza tena, mwombe mhudumu bill mpya.', 'This bill is paid - thank you! To order again, ask for a new bill.'],
  seeMyBill: ['Angalia bill', 'See bill'],
  services: ['Huduma', 'Services'], addServices: ['Ongeza huduma', 'Add services'],
  billOrderSent: ['Oda imetumwa - mhudumu wako ameiona na inaandaliwa.', 'Order sent - your waiter has it and it is being prepared.'], billText: ['Andika namba ya bill yako (iko kwenye bill au muulize mhudumu), mfano MK-1.', 'Type your bill number (on the bill, or ask your waiter), e.g. MK-1.'],
  billNo: ['Namba ya bill, mfano MK-1', 'Bill number, e.g. MK-1'], seeBill: ['Angalia bill', 'See bill'],
  noBillNo: ['Sijui namba - mwite mhudumu', "I don't know it - call the waiter"], billNotFound: ['Bill hiyo haipo. Hakikisha namba, au mwite mhudumu.', 'No such bill. Check the number, or call the waiter.'],
  billWaiter: ['Mhudumu', 'Waiter'], billPaidAll: ['Imelipwa yote - asante!', 'Fully paid - thank you!'], billPaidSoFar: ['Umelipa', 'Paid'],
  billToPay: ['Kiasi cha kulipa', 'To pay'], billWaiterTold: ['Mhudumu wako amejulishwa unataka bill.', 'Your waiter has been told you want the bill.'],
  billEmpty: ['Bado hakuna kilichowekwa kwenye bill hii.', 'Nothing is on this bill yet.'], payNow: ['Lipa sasa', 'Pay now'], otherBill: ['Angalia bill nyingine', 'Another bill'],
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
  refNeeded: ['Andika kumbukumbu ya muamala (ref) kutoka kwenye SMS ya malipo.', 'Write the transaction reference from the payment SMS.'],
  refUsed: ['Kumbukumbu hii (ref) imeshatumika. Angalia SMS yako tena.', 'This reference was already used. Check your SMS again.'],
  billAlreadyPaid: ['Bill hii imeshalipwa - asante!', 'This bill is already paid - thank you!'],
  claimPending: ['Tumepokea - cashier anahakiki malipo yako...', 'Received - the cashier is checking your payment...'],
  claimOk: ['Malipo yamethibitishwa. Asante!', 'Payment confirmed. Thank you!'],
  claimNo: ['Malipo hayajathibitishwa', 'Payment not confirmed'],
  forBill: ['Kwa bill', 'For bill'],
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
  readonly sheet = signal<'none' | 'feedback' | 'card' | 'cart' | 'pay' | 'bill'>('none');
  /** The bill the customer looked up by its number (owner, 2026-11-10). */
  readonly bill = signal<BillCopy | null>(null);
  readonly billError = signal('');
  billCode = '';
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
  /** The customer's last "Nimelipa", watched until the cashier answers (owner, 2026-11-11). */
  readonly claim = signal<{ uid: string; status: 'PENDING' | 'CONFIRMED' | 'REJECTED'; reason?: string | null; amount?: number | null; billCode?: string | null } | null>(null);
  private claimTimer: ReturnType<typeof setInterval> | null = null;
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
    inject(DestroyRef).onDestroy(() => {
      if (this.ordersTimer) clearInterval(this.ordersTimer);
      if (this.claimTimer) clearInterval(this.claimTimer);
    });
    try {
      const last = localStorage.getItem('meza.claim.' + this.token);
      if (last) this.watchClaim(last);
    } catch { /* private mode */ }
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
          if (res.data.bill) this.loadMyBill(false);
        } else {
          this.state.set('missing');
        }
      },
      error: () => this.state.set('offline'),
    });
  }

  /** A bill's own window (its QR): the bill, always at hand (owner, 2026-11-10). */
  readonly billMode = computed(() => !!this.view()?.bill);
  readonly billOpen = computed(() => {
    const b = this.bill();
    return this.billMode() && (b ? b.status === 'PENDING' : !!this.view()?.bill?.open);
  });

  /** A bill's window: the menu is shown once "Huduma" is tapped. */
  readonly showMenu = signal(false);

  openMenu(): void {
    this.sheet.set('none');
    this.showMenu.set(true);
    setTimeout(() => document.getElementById('ct-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  /** The bill's copy; with ask, its waiter is told the customer wants it. */
  loadMyBill(ask = false): void {
    this.http.get<{ data?: BillCopy }>(this.url('/myBill'), { params: { ask } }).subscribe({
      next: (res) => { if (res?.data) this.bill.set(res.data); },
      error: () => {},
    });
  }

  private loadOrders(): void {
    if (this.billMode()) this.loadMyBill(false);
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

  openSheet(which: 'feedback' | 'card' | 'cart' | 'pay' | 'bill'): void {
    if (which === 'pay' && !this.payMethod) this.payMethod = this.payNumbers()[0]?.method ?? 'M-Pesa';
    // The amount left on the bill the customer is looking at.
    if (which === 'pay' && !this.payAmount && this.bill()?.status === 'PENDING' && (this.bill()?.toPay ?? 0) > 0) {
      this.payAmount = String(this.bill()!.toPay);
    }
    if (which === 'bill' && this.billMode()) {
      // Its own bill: no number to type - just the copy (the waiter is called with "Mwite mhudumu").
      this.loadMyBill(false);
    } else if (which === 'bill' && !this.billCode) {
      try { this.billCode = localStorage.getItem('meza.bill.' + this.token) ?? ''; } catch { /* private mode */ }
    }
    this.billError.set('');
    this.sheet.set(which);
  }

  /** The customer's bill by its number: a copy of it, and their waiter is told. */
  findBill(): void {
    const code = this.billCode.trim().toUpperCase();
    if (!code || this.sending()) return;
    this.sending.set(true);
    this.billError.set('');
    this.http.post<{ data?: BillCopy; message?: string }>(this.url('/bill'), { code }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.data) {
          this.bill.set(res.data);
          try { localStorage.setItem('meza.bill.' + this.token, res.data.code); } catch { /* private mode */ }
        } else {
          this.billError.set(this.t(res?.message === 'TOO_MANY' ? 'tooMany' : res?.message === 'BILL_NOT_FOUND' ? 'billNotFound' : 'failed'));
        }
      },
      error: () => { this.sending.set(false); this.billError.set(this.t('offline')); },
    });
  }

  /** From the bill copy to paying it: the amount left is filled in. */
  payBill(): void {
    const b = this.bill();
    if (b && b.toPay > 0) this.payAmount = String(b.toPay);
    this.openSheet('pay');
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
          this.flash(this.billMode() ? 'billOrderSent' : 'orderSent');
          this.loadOrders();
        } else {
          this.flash(res?.message === 'TOO_MANY' ? 'tooMany' : 'failed');
        }
      },
      error: () => { this.sending.set(false); this.flash('offline'); },
    });
  }

  /** The bill this payment is for: the bill's own QR, or the one looked up by its number here. */
  readonly payBillCode = computed(() => {
    const b = this.bill();
    return b && b.status === 'PENDING' ? b.code : null;
  });

  sendPaid(): void {
    if (!this.payRef.trim()) { this.flash('refNeeded'); return; }
    if (this.sending()) return;
    this.sending.set(true);
    this.http.post<{ data?: { claim?: string }; message?: string }>(this.url('/paid'), {
      method: this.payMethod, name: this.payName.trim() || null, ref: this.payRef.trim(), amount: this.payAmount ? String(this.payAmount).trim() : null,
      billCode: this.billMode() ? null : this.payBillCode(),
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.data) {
          this.sheet.set('none');
          this.payRef = '';
          this.payAmount = '';
          this.flash('paidOk');
          if (res.data.claim) this.watchClaim(res.data.claim);
        } else {
          const m = res?.message;
          this.flash(m === 'TOO_SOON' ? 'tooSoon' : m === 'REF_REQUIRED' ? 'refNeeded' : m === 'REF_USED' ? 'refUsed' : m === 'BILL_PAID' ? 'billAlreadyPaid' : 'failed');
        }
      },
      error: () => { this.sending.set(false); this.flash('offline'); },
    });
  }

  /** Asks every 10 s until the cashier confirms or turns it down. */
  private watchClaim(uid: string): void {
    this.claim.set({ uid, status: 'PENDING' });
    try { localStorage.setItem('meza.claim.' + this.token, uid); } catch { /* private mode */ }
    if (this.claimTimer) clearInterval(this.claimTimer);
    const ask = () => this.http.get<{ data?: { status: 'PENDING' | 'CONFIRMED' | 'REJECTED'; reason?: string; amount?: number; billCode?: string } }>(this.url('/paid/' + uid)).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) { this.stopClaim(); return; }
        this.claim.set({ uid, ...d });
        if (d.status !== 'PENDING') {
          if (this.claimTimer) clearInterval(this.claimTimer);
          this.claimTimer = null;
          if (d.status === 'CONFIRMED' && this.billMode()) this.loadMyBill(false);
        }
      },
      error: () => {},
    });
    ask();
    this.claimTimer = setInterval(ask, 10_000);
  }

  stopClaim(): void {
    if (this.claimTimer) clearInterval(this.claimTimer);
    this.claimTimer = null;
    this.claim.set(null);
    try { localStorage.removeItem('meza.claim.' + this.token); } catch { /* private mode */ }
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
