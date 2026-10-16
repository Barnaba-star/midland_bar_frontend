import { ORDER_STATIONS } from './supervisor-role.guard';
import { BrandWord } from '../../Utils/component/brand-word/brand-word';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { FormField } from '../../Utils/models/form-field';
import { Authentication } from '../../Utils/services/authentication';
import { ServiceBarMethod } from '../service-bar-method';
import { StaffOrder, StaffOrderLine } from '../BarModel';
import { LiveChanges } from '../../Utils/services/live-changes';
import { Subscription } from 'rxjs';
import { borrowCounterSession } from '../bar-staff-sell/counter-session';

/** A fallback only: the live stream brings new orders at once. */
const POLL_MS = 15000;
const SOUND_KEY = 'bar_supervisor_sound';
const STATION_KEY = 'bar_supervisor_station';
/** While orders wait, the alarm rings again this often until someone acts. */
const REMIND_MS = 30000;

/**
 * The supervisor's screen. Every order a staff member hands over at Staff
 * Sell pops up here, oldest first - ten at once is normal on a busy night.
 * Receive lets the drinks leave and puts the order on the bill; Reject turns
 * it back with a reason the staff member sees.
 */
@Component({
  selector: 'app-bar-supervisor',
  imports: [BrandWord, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './bar-supervisor.html',
  styleUrl: './bar-supervisor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSupervisor implements OnInit, OnDestroy {
  constructor(
    private barService: ServiceBarMethod,
    private auth: Authentication,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private liveChanges: LiveChanges,
    private translate: TranslateService,
  ) {}

  orders: StaffOrder[] = [];
  loaded = false;
  busy: Record<string, boolean> = {};
  /**
   * Orders this screen has received or rejected. A poll that left before the
   * decision landed can still carry them; they are dropped so a decided card
   * never comes back.
   */
  private decided = new Set<string>();

  /** Orders that arrived since the last look - they flash. */
  fresh = new Set<string>();
  sound = this.readSound();
  now = Date.now();

  private timer: ReturnType<typeof setInterval> | null = null;
  private live: Subscription | null = null;
  private audio: AudioContext | null = null;
  private lastRing = 0;
  /**
   * The browser keeps sound off until the page is touched once. True while
   * that is so - a banner asks for the one tap.
   */
  soundLocked = false;
  private readonly unlock = () => this.unlockSound();

  /** A SUPERVISOR has only this screen; managers and above came from POS and can go back. */
  /** Someone whose whole app is this queue (COUNTER, CHEF, an older SUPERVISOR) - no way back to POS. */
  get onlySupervisor(): boolean {
    return [...ORDER_STATIONS, 'SUPERVISOR'].some((r) => this.auth.hasRole(r))
      && !['ROOT', 'STAFF', 'DIRECTOR', 'ADMIN', 'CEO', 'MANAGER'].some((r) => this.auth.hasRole(r));
  }

  /** Each station sees only its own orders (the server sends only theirs); the title says which. */
  get pageTitle(): string {
    const held = ORDER_STATIONS.filter((s) => this.auth.hasRole(s));
    if (this.onlySupervisor && held.length === 1) {
      return 'SUPERVISOR_PAGE.TITLE_' + held[0];
    }
    return 'SUPERVISOR_PAGE.TITLE';
  }

  /** The station roles this login holds - two or more (counter and juice) see both. */
  get heldStations(): string[] {
    return ORDER_STATIONS.filter((s) => this.auth.hasRole(s));
  }

  /** A station-only login holding two or more: the title lists them. */
  get multiStationTitle(): boolean {
    return this.onlySupervisor && this.heldStations.length > 1;
  }

  /** One station only: nothing to filter - the server sends just theirs. */
  get showStationChips(): boolean {
    return !(this.onlySupervisor && this.heldStations.length === 1);
  }

  /** ALL, or the one station picked on this browser. */
  stationFilter = this.readStationFilter();

  /** The stations to offer: the ones held, those with orders waiting, and the one picked. */
  get stationChips(): { station: string; count: number }[] {
    const offered = new Set<string>(this.onlySupervisor ? this.heldStations : []);
    this.orders.forEach((o) => o.station && offered.add(o.station));
    if (this.stationFilter !== 'ALL') {
      offered.add(this.stationFilter);
    }
    return ORDER_STATIONS.filter((s) => offered.has(s))
      .map((station) => ({ station, count: this.orders.filter((o) => this.forStation(o, station)).length }));
  }

  /** No station on the order (older and mixed offline ones) = every station's. */
  private forStation(order: StaffOrder, station: string): boolean {
    return !order.station || order.station === station;
  }

  get visibleOrders(): StaffOrder[] {
    const f = this.stationFilter;
    return f === 'ALL' || !this.showStationChips ? this.orders : this.orders.filter((o) => this.forStation(o, f));
  }

  pickStation(station: string): void {
    this.stationFilter = station;
    try {
      localStorage.setItem(STATION_KEY, station);
    } catch {
      // Remembering is a convenience only.
    }
    this.cdr.markForCheck();
  }

  /** "Counter, Juice na Biss". */
  stationList(stations: string[]): string {
    const names = stations.map((s) => this.translate.instant(this.stationKey(s)));
    if (names.length < 2) {
      return names.join('');
    }
    return names.slice(0, -1).join(this.translate.instant('SUPERVISOR_PAGE.COMMA'))
      + this.translate.instant('SUPERVISOR_PAGE.AND') + names[names.length - 1];
  }

  stationKey(station: string | undefined | null): string {
    return 'SUPERVISOR_PAGE.STATION_' + (station || 'ANY');
  }

  stationClass(station: string | undefined | null): string {
    return 'station-' + (station || 'any').toLowerCase();
  }

  private readStationFilter(): string {
    try {
      const v = localStorage.getItem(STATION_KEY);
      return v && ORDER_STATIONS.includes(v) ? v : 'ALL';
    } catch {
      return 'ALL';
    }
  }

  get userName(): string {
    return this.auth.getFullName() || this.auth.getUsername();
  }

  ngOnInit(): void {
    // Any first tap or key on the page turns sound on for the rest of the shift.
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, this.unlock, { capture: true }));
    this.checkSoundLock();
    this.load();
    this.timer = setInterval(() => this.load(), POLL_MS);
    // A staff member pressed Send: the queue arrives with the nudge - shown now, no fetch.
    this.live = this.liveChanges.pending<StaffOrder>().subscribe((orders) => this.showPending(orders));
    // Back after a dropped connection: whatever was missed.
    this.live.add(this.liveChanges.on('resync').subscribe(() => this.load()));
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.live?.unsubscribe();
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.removeEventListener(e, this.unlock, { capture: true }));
    this.audio?.close().catch(() => undefined);
    if (this.titleBlink) {
      clearInterval(this.titleBlink);
    }
    document.title = this.baseTitle;
  }

  /**
   * The browser tab says how many orders wait, flashing - seen from another
   * tab or window even when the computer gives no sound (page never touched
   * since it loaded, tab muted).
   */
  private readonly baseTitle = document.title;
  private titleBlink: ReturnType<typeof setInterval> | null = null;
  private titleOn = false;

  private showWaitingInTitle(): void {
    const n = this.orders.length;
    if (!n) {
      if (this.titleBlink) {
        clearInterval(this.titleBlink);
        this.titleBlink = null;
      }
      document.title = this.baseTitle;
      return;
    }
    const text = `(${n}) ${this.translate.instant('SUPERVISOR_PAGE.NOTIFY_TITLE')}`;
    if (!this.titleBlink) {
      this.titleBlink = setInterval(() => {
        this.titleOn = !this.titleOn;
        document.title = this.titleOn ? `🔔 ${this.waitingTitle}` : this.waitingTitle;
      }, 1000);
    }
    this.waitingTitle = text;
  }

  private waitingTitle = '';

  /** Orders that went straight onto bills while there was no internet - to look over. */
  offlineOrders: StaffOrder[] = [];

  reviewOffline(order: StaffOrder): void {
    if (this.busy[order.uid]) {
      return;
    }
    this.busy = { ...this.busy, [order.uid]: true };
    this.barService.reviewStaffOrder(order.uid).subscribe({
      next: (res) => {
        this.busy = { ...this.busy, [order.uid]: false };
        if (res?.data) {
          this.offlineOrders = this.offlineOrders.filter((o) => o.uid !== order.uid);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = { ...this.busy, [order.uid]: false };
        this.cdr.markForCheck();
      },
    });
  }

  load(): void {
    this.barService.offlineUnreviewedOrders().subscribe({
      next: (res) => {
        this.offlineOrders = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.barService.pendingStaffOrders().subscribe({
      next: (res) => this.showPending(res?.data ?? []),
      error: () => {
        this.loaded = true;
        this.cdr.markForCheck();
      },
    });
  }

  /** The queue as the server has it - from a poll or pushed live. */
  private showPending(pending: StaffOrder[]): void {
    const incoming = pending.filter((o) => !this.decided.has(o.uid));
    const known = new Set(this.orders.map((o) => o.uid));
    const arrived = this.loaded ? incoming.filter((o) => !known.has(o.uid)) : [];
    this.fresh = new Set(arrived.map((o) => o.uid));
    // Keep a card that is mid-decision even if a poll races it.
    this.orders = incoming.filter((o) => !this.busy[o.uid] || known.has(o.uid));
    this.now = Date.now();
    this.loaded = true;
    if (arrived.length) {
      this.beep();
      this.notify(arrived);
    } else if (this.orders.length && Date.now() - this.lastRing >= REMIND_MS) {
      // Still waiting: ring again so a busy counter cannot miss it.
      this.beep();
    }
    this.showWaitingInTitle();
    this.cdr.markForCheck();
  }

  /** A change: what comes back counts against what goes out. */
  total(order: StaffOrder): number {
    return order.lines.reduce((sum, l) => sum + (l.unitPrice || 0) * l.quantity * (l.returnOfSalesUid ? -1 : 1), 0);
  }

  /** On a change, coming back is red and going out green; otherwise the owner's Biss / juice colours. */
  lineClass(order: StaffOrder, line: StaffOrderLine): string {
    if (order.exchange) {
      return line.returnOfSalesUid ? 'swap-back' : 'swap-give';
    }
    const t = this.tint(line.serviceName);
    return t ? 'tint-' + t : '';
  }

  /** Owner's colours on the ticket: any Biss green, any fresh juice blue, the rest as they were. */
  tint(name: string | undefined): 'biss' | 'juice' | null {
    const n = (name ?? '').toLowerCase();
    if (n.includes('biss')) return 'biss';
    if (n.includes('fresh') && n.includes('juice')) return 'juice';
    return null;
  }

  /** Minutes the order has waited - the oldest ones are the ones to clear first. */
  waited(order: StaffOrder): number {
    if (!order.sentAt) {
      return 0;
    }
    return Math.max(0, Math.floor((this.now - new Date(order.sentAt).getTime()) / 60000));
  }

  receive(order: StaffOrder): void {
    if (this.busy[order.uid]) {
      return;
    }
    this.busy = { ...this.busy, [order.uid]: true };
    this.cdr.markForCheck();
    this.barService.receiveStaffOrder(order.uid).subscribe({
      next: (res) => this.done(order, !!res?.data),
      // Not enough stock, bill already paid...: the reason is shown by the interceptor; the card stays.
      error: () => this.done(order, false),
    });
  }

  reject(order: StaffOrder): void {
    const fields: FormField[] = [
      {
        name: 'reason',
        type: 'textarea',
        label: 'SUPERVISOR_PAGE.REJECT_REASON',
        placeholder: 'SUPERVISOR_PAGE.REJECT_REASON_PH',
        required: true,
      },
    ];
    this.dialog.open(DialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { formTitle: 'SUPERVISOR_PAGE.REJECT_TITLE', fields },
    }).afterClosed().subscribe((result) => {
      const reason = (result?.reason ?? '').trim();
      if (!reason) {
        return;
      }
      this.busy = { ...this.busy, [order.uid]: true };
      this.cdr.markForCheck();
      this.barService.rejectStaffOrder(order.uid, reason).subscribe({
        next: (res) => this.done(order, !!res?.data),
        error: () => this.done(order, false),
      });
    });
  }

  private done(order: StaffOrder, decided: boolean): void {
    const { [order.uid]: _, ...rest } = this.busy;
    this.busy = rest;
    if (decided) {
      this.decided.add(order.uid);
      this.orders = this.orders.filter((o) => o.uid !== order.uid);
      this.showWaitingInTitle();
    }
    this.cdr.markForCheck();
  }

  /** The banner: sound on, and a ring so they hear how loud it is. */
  toggleSoundOn(): void {
    this.unlockSound();
    this.beep();
  }

  toggleSound(): void {
    this.sound = !this.sound;
    try {
      localStorage.setItem(SOUND_KEY, this.sound ? '1' : '0');
    } catch {
      // Remembering is a convenience only.
    }
    if (this.sound) {
      this.unlockSound();
      this.beep();
    } else {
      this.checkSoundLock();
    }
  }

  backToPos(): void {
    this.router.navigate(['/pos']);
  }

  /** The counter sells to customers sitting there: its own bills, handed to the cashier. */
  get canSellHere(): boolean {
    return this.auth.getPermissions().split(',').includes('COUNTER_SELL');
  }

  openingMine = false;

  myBills(): void {
    if (this.openingMine) {
      return;
    }
    this.openingMine = true;
    this.cdr.markForCheck();
    this.barService.counterSession().subscribe({
      next: (res) => {
        this.openingMine = false;
        if (res?.token) {
          borrowCounterSession(this.auth, res.token);
          this.router.navigate(['/staff-sell']);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.openingMine = false;
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
    this.auth.stopHeartbeat();
    this.auth.removeToken();
    this.router.navigate(['/login']);
  }

  /** The computer's own notifications (Windows / Mac) - they sound even before the page is touched. */
  notifyState: NotificationPermission | 'unsupported' = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

  askNotify(): void {
    if (typeof Notification === 'undefined') {
      return;
    }
    Notification.requestPermission().then((p) => {
      this.notifyState = p;
      this.cdr.markForCheck();
    });
  }

  private notify(arrived: StaffOrder[]): void {
    if (!this.sound || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    try {
      const first = arrived[0];
      const body = arrived.length === 1
        ? `${first.staffName || first.staffCode} · ${first.lines.map((l) => `${l.serviceName} x${l.quantity}`).join(', ')}`
        : this.translate.instant('SUPERVISOR_PAGE.NOTIFY_MANY', { count: arrived.length });
      const n = new Notification(this.translate.instant('SUPERVISOR_PAGE.NOTIFY_TITLE'), {
        body,
        tag: 'baronix-new-order',
        renotify: true,
        requireInteraction: true,
        silent: false,
      } as NotificationOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // Some browsers only allow notifications from a service worker - the alarm still rings.
    }
  }

  /** The page was touched: wake the sound up (browsers start it asleep). */
  private unlockSound(): void {
    try {
      this.ctx();
      if (this.audio!.state === 'suspended') {
        this.audio!.resume().finally(() => this.checkSoundLock());
      } else {
        this.checkSoundLock();
      }
    } catch {
      // No sound on this device.
    }
  }

  /** One context for the page; the banner follows its state. */
  private ctx(): AudioContext {
    if (!this.audio) {
      this.audio = new AudioContext();
      this.audio.onstatechange = () => this.checkSoundLock();
    }
    return this.audio;
  }

  private checkSoundLock(): void {
    let locked = false;
    try {
      this.ctx();
      locked = this.sound && this.ctx().state !== 'running';
    } catch {
      locked = false;
    }
    if (locked !== this.soundLocked) {
      this.soundLocked = locked;
      this.cdr.markForCheck();
    }
  }

  /**
   * A loud alarm for a new order: three rings of a two-tone bell, about two
   * and a half seconds, through a compressor so it is as loud as the device
   * allows. Browsers only allow it after the page has been touched once.
   */
  private beep(): void {
    if (!this.sound) {
      return;
    }
    this.lastRing = Date.now();
    try {
      const ctx = this.ctx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }
      const loud = ctx.createDynamicsCompressor();
      loud.threshold.value = -30;
      loud.knee.value = 0;
      loud.ratio.value = 20;
      const master = ctx.createGain();
      master.gain.value = 1;
      loud.connect(master).connect(ctx.destination);

      const t0 = ctx.currentTime + 0.05;
      for (let ring = 0; ring < 3; ring++) {
        [988, 1319, 988, 1319].forEach((freq, i) => {
          const at = t0 + ring * 0.85 + i * 0.14;
          // Square and sawtooth carry far better through a noisy bar than a sine.
          for (const type of ['square', 'sawtooth'] as OscillatorType[]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = type === 'square' ? freq : freq * 2;
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(type === 'square' ? 0.9 : 0.35, at + 0.01);
            gain.gain.setValueAtTime(type === 'square' ? 0.9 : 0.35, at + 0.11);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
            osc.connect(gain).connect(loud);
            osc.start(at);
            osc.stop(at + 0.14);
          }
        });
      }
    } catch {
      // No sound available - the flashing card still says it.
    }
    this.checkSoundLock();
  }

  private readSound(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
