import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { FormField } from '../../Utils/models/form-field';
import { Authentication } from '../../Utils/services/authentication';
import { ServiceBarMethod } from '../service-bar-method';
import { StaffOrder } from '../BarModel';
import { LiveChanges } from '../../Utils/services/live-changes';
import { Subscription } from 'rxjs';

/** A fallback only: the live stream brings new orders at once. */
const POLL_MS = 15000;
const SOUND_KEY = 'bar_supervisor_sound';

/**
 * The supervisor's screen. Every order a staff member hands over at Staff
 * Sell pops up here, oldest first - ten at once is normal on a busy night.
 * Receive lets the drinks leave and puts the order on the bill; Reject turns
 * it back with a reason the staff member sees.
 */
@Component({
  selector: 'app-bar-supervisor',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
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

  /** A SUPERVISOR has only this screen; managers and above came from POS and can go back. */
  get onlySupervisor(): boolean {
    return this.auth.hasRole('SUPERVISOR')
      && !['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER'].some((r) => this.auth.hasRole(r));
  }

  get userName(): string {
    return this.auth.getFullName() || this.auth.getUsername();
  }

  ngOnInit(): void {
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
    this.audio?.close().catch(() => undefined);
  }

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
    }
    this.cdr.markForCheck();
  }

  total(order: StaffOrder): number {
    return order.lines.reduce((sum, l) => sum + (l.unitPrice || 0) * l.quantity, 0);
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
    }
    this.cdr.markForCheck();
  }

  toggleSound(): void {
    this.sound = !this.sound;
    try {
      localStorage.setItem(SOUND_KEY, this.sound ? '1' : '0');
    } catch {
      // Remembering is a convenience only.
    }
    if (this.sound) {
      this.beep();
    }
  }

  backToPos(): void {
    this.router.navigate(['/pos']);
  }

  logout(): void {
    this.auth.stopHeartbeat();
    this.auth.removeToken();
    this.router.navigate(['/login']);
  }

  /** A short two-note chime. Browsers only allow it after the page has been clicked once. */
  private beep(): void {
    if (!this.sound) {
      return;
    }
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.16 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.16);
        osc.stop(ctx.currentTime + i * 0.16 + 0.16);
      });
    } catch {
      // No sound available - the flashing card still says it.
    }
  }

  private readSound(): boolean {
    try {
      return localStorage.getItem(SOUND_KEY) !== '0';
    } catch {
      return true;
    }
  }
}
