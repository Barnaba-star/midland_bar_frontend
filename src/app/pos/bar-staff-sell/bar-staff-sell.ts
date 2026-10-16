import { counterLoginToken, isCounterSession, returnFromCounterSession } from './counter-session';
import { BrandWord } from '../../Utils/component/brand-word/brand-word';
import { PaymentNoteDialog } from '../../Utils/component/dialogs/payment-note-dialog/payment-note-dialog';
import { SellableItems } from '../../Utils/services/sellable-items';
import { OfflineService } from '../../Utils/offline/offline.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BillNicknames } from '../../Utils/services/bill-nicknames';
import { ShiftBar } from '../shift-bar/shift-bar';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, DestroyRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { SaleItemDialogComponent, SaleItemResult } from '../../Utils/component/dialogs/sale-item-dialog-component/sale-item-dialog-component';
import { SaleDetailsDialogComponent } from '../../Utils/component/sale-details-dialog-component/sale-details-dialog-component';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { AlertService } from '../../Utils/services/alert';
import { ServiceBarMethod } from '../service-bar-method';
import { lockStaffSell, unlockStaffSell } from './staff-sell-lock';
import { StaffSellUnlockDialog } from './unlock-dialog/unlock-dialog';
import { StaffHandoverDialog } from './handover-dialog/handover-dialog';
import { ColleagueResult, StaffColleagueDialog } from './colleague-dialog/colleague-dialog';
import { Subscription } from 'rxjs';
import { LiveChanges } from '../../Utils/services/live-changes';
import { landingFor } from '../../login/landing-for';
import { Authentication } from '../../Utils/services/authentication';
import { SalesOpened, StaffOrder, StaffSellStaff } from '../BarModel';
import { CategoryIconPipe } from '../../Utils/pipes/product-category.pipe';

/**
 * Staff Sell, a module of its own beside POS, Settings and Admin. Staff are
 * not users of the system: a manager signs in and opens this from POS, and
 * the screen shows nothing but the code window until a staff member types
 * theirs. The only way out is back to POS. A staff
 * member types their code (K1, 001) and works their own bills - add to them,
 * look inside, pay. Bills opened here belong to them and are numbered from
 * their code (K1-1, K1-2...), so what sells on them is theirs, commission and
 * all. Everything else is the Sales page's own calls and dialogs: the bills
 * show there too.
 *
 * "Add Service" does not go on the bill: it is written onto the bill's order
 * for the supervisor. Switching staff (or Send) hands it over; the supervisor
 * receives it - only then is it on the bill and out of the store - or turns
 * it back with a reason, which shows here.
 */
@Component({
  selector: 'app-bar-staff-sell',
  imports: [CategoryIconPipe, BrandWord, ShiftBar, EmptyStateComponent, MatIconModule, FormsModule, DecimalPipe, TranslatePipe],
  templateUrl: './bar-staff-sell.html',
  styleUrl: './bar-staff-sell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStaffSell implements OnInit, OnDestroy {
  @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;
  @ViewChild(ShiftBar) shiftBar?: ShiftBar;

  constructor(
    private barService: ServiceBarMethod,
    private dialog: MatDialog,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private auth: Authentication,
  ) {}

  code = '';
  looking = false;
  staff: StaffSellStaff | null = null;
  bills: SalesOpened[] = [];
  /** This device's nicknames for open bills - never saved to the backend. */
  readonly nicknames = inject(BillNicknames);
  private offline = inject(OfflineService);
  private sellable = inject(SellableItems);
  private destroyRef = inject(DestroyRef);
  private liveChanges = inject(LiveChanges);
  /** Lines on each bill, keyed by bill uid. */
  billLines: Partial<Record<string, any[]>> = {};
  busyBill: string | null = null;

  opening = false;

  /** Written orders on this staff member's bills: still writing, with the supervisor, or turned back. */
  orders: StaffOrder[] = [];
  sending = false;
  /** While orders wait on the supervisor, look again now and then so the bill fills in as they are received. */
  private poll: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Sound may only start from a tap; the first one on the page wakes it for the shift.
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, this.wakeSound, { capture: true }));
    // From here on the till stays in Staff Sell until a manager lets it out.
    lockStaffSell();
    // Signed in with their own code + PIN: straight to their bills, no keypad.
    if (this.ownSession) {
      this.code = this.auth.getStaffCode();
      this.findStaff();
    }
    // The add-item list, loaded before the first tap - the drink search reads it too.
    this.sellable.prefetch();
    this.loadDrinks();
    // Orders and bills made offline have reached the server: read them again.
    this.offline.synced.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh(true));
    this.listenLive();
    this.watchCounterQueue();
    if (!this.touch) {
      setTimeout(() => this.codeInput?.nativeElement.focus());
    }
  }

  /** Summary: cash to hand over, phone money, and what is already paid this shift. */
  openHandover(): void {
    if (!this.staff) {
      return;
    }
    this.dialog.open(StaffHandoverDialog, {
      width: '460px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { staffCode: this.staff.staffCode, mode: 'staff', staffName: this.staff.name, bills: this.bills },
    }).afterClosed().subscribe(() => this.refresh());
  }

  /** "Paid by phone, from this name" - noted on the bill for the cashier; marks nothing paid. */
  openPaymentNote(bill: SalesOpened): void {
    this.dialog.open(PaymentNoteDialog, {
      width: '440px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { bill },
    }).afterClosed().subscribe((updated?: SalesOpened) => {
      if (updated) {
        bill.paymentNoteMethod = updated.paymentNoteMethod ?? null;
        bill.paymentNotePayer = updated.paymentNotePayer ?? null;
        bill.paymentNoteRef = updated.paymentNoteRef ?? null;
        this.cdr.markForCheck();
      }
    });
  }

  /** A bill opened by mistake, still at zero - asked once, then gone and its code free again. */
  deleteEmptyBill(bill: SalesOpened): void {
    if (!bill.uid || this.busyBill) {
      return;
    }
    this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: {
        title: this.translate.instant('SALES_PAGE.DELETE_BILL_TITLE'),
        message: this.translate.instant('SALES_PAGE.DELETE_BILL_CONFIRM', { code: bill.salesCode }),
        item: { ...bill, branchName: bill.salesCode, branchCode: '' },
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.busyBill = bill.uid!;
      this.cdr.markForCheck();
      this.barService.deleteEmptyBill(bill.uid!).subscribe({
        next: (res) => {
          this.busyBill = null;
          if (res?.data) {
            this.bills = this.bills.filter((b) => b.uid !== bill.uid);
            this.nicknames.remove(bill.uid);
            this.alertService.show('success', this.translate.instant('SALES_PAGE.BILL_DELETED', { code: bill.salesCode }));
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.busyBill = null;
          this.cdr.markForCheck();
        },
      });
    });
  }

  ngOnDestroy(): void {
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.removeEventListener(e, this.wakeSound, { capture: true }));
    this.audio?.close().catch(() => undefined);
    this.stopPoll();
    this.live?.unsubscribe();
    if (this.counterWatch) {
      clearInterval(this.counterWatch);
    }
  }

  private live?: Subscription;

  // ---- The counter on its own bills still hears new orders ----

  private counterWatch: ReturnType<typeof setInterval> | null = null;
  /** Orders already in the queue; null until the first look. */
  private counterKnown: Set<string> | null = null;

  /**
   * "Bili zangu" takes the counter off the orders screen, which used to stop
   * its alarm: a waiter's order sent meanwhile went unheard. While here, the
   * queue is read with the counter's own login and a new order rings.
   */
  private watchCounterQueue(): void {
    const token = isCounterSession() ? counterLoginToken() : null;
    if (!token) {
      return;
    }
    const look = () => this.barService.pendingStaffOrdersAs(token).subscribe({
      next: (res) => {
        const uids = (res?.data ?? []).map((o) => o.uid);
        const arrived = this.counterKnown ? uids.filter((u) => !this.counterKnown!.has(u)) : [];
        this.counterKnown = new Set(uids);
        if (arrived.length) {
          this.chime([988, 1319, 988, 1319]);
          this.alertService.show('info', this.translate.instant('STAFF_SELL_PAGE.COUNTER_NEW_ORDER', { count: arrived.length }));
        }
      },
      error: () => {},
    });
    look();
    this.counterWatch = setInterval(look, 8000);
  }

  /**
   * The supervisor received or rejected, or a bill moved at the till: show it
   * at once. Started again after a colleague signs in, so the stream opens
   * with their token.
   */
  private listenLive(): void {
    this.live?.unsubscribe();
    this.live = this.liveChanges.on('orders', 'bills').subscribe(() => this.refresh(true));
  }

  // ---- "Mpishe mwenzako": a colleague whose phone is broken sells on this one ----

  /**
   * Only in a staff member's own session: the keypad till already has
   * "Switch staff", and the counter's own bills go back to its queue.
   */
  get canLetColleague(): boolean {
    return this.ownSession && !this.counterSession;
  }

  /** A waiter who typed their code on the manager's till. */
  get tillStaff(): boolean {
    return !this.ownSession && !!this.staff;
  }

  /** The way out: the manager's (empty keypad), the counter's, or a signed-in waiter's sign-out. */
  get showExit(): boolean {
    return !this.tillStaff;
  }

  letColleagueSell(): void {
    if (!this.canLetColleague || this.sending) {
      return;
    }
    this.dialog.open(StaffColleagueDialog, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { currentName: this.staff?.name ?? '', unsent: this.unsentCount },
    }).afterClosed().subscribe((result?: ColleagueResult) => {
      if (!result) {
        return;
      }
      if ('send' in result) {
        // Send what was written, then ask again.
        this.sendOrders(() => {
          this.refresh();
          this.letColleagueSell();
        });
        return;
      }
      if ('setCode' in result) {
        // Their code still needs its first-time setup, which only the login page does.
        this.auth.removeToken();
        unlockStaffSell();
        this.router.navigate(['/login'], { queryParams: { code: result.setCode } });
        return;
      }
      this.becomeColleague(result.token);
    });
  }

  /** The screen is now the colleague's: their token, their bills, the shift bar and live stream anew. */
  private becomeColleague(token: string): void {
    this.auth.setToken(token);
    lockStaffSell();
    this.closeBill();
    this.pickerOpen = false;
    this.pickerSearch = '';
    this.drinkQuery = '';
    this.clearStaff();
    this.code = this.auth.getStaffCode();
    this.listenLive();
    this.shiftBar?.load();
    this.findStaff((name) =>
      this.alertService.show('success', this.translate.instant('STAFF_SELL_PAGE.COLLEAGUE_NOW', { name })));
  }

  // ---- Drink search: "a drink that tastes of lime / sweet" - answer the customer ----

  /** Everything that can be sold, for the search below. */
  drinks: any[] = [];
  drinkQuery = '';

  private loadDrinks(): void {
    const known = this.sellable.current();
    if (known) {
      this.drinks = known;
    }
    this.sellable.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.drinks = items;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Every word typed has to be found in the name, code, description (where
   * the flavours are written) or category - so "tamu baridi" finds the
   * sweet ones described as cold too. Names that match come first.
   */
  get drinkMatches(): any[] {
    const words = this.drinkQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [];
    }
    const named: any[] = [];
    const described: any[] = [];
    for (const s of this.drinks) {
      const name = String(s.serviceName ?? '').toLowerCase();
      const text = [name, s.serviceCode, s.description, s.category]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      if (!words.every((w) => flavourWords(w).some((f) => text.includes(f)))) {
        continue;
      }
      (words.every((w) => name.includes(w)) ? named : described).push(s);
    }
    return [...named, ...described].slice(0, 20);
  }

  /** How many can still be sold, or null when not counted - as the add-item dialog says it. */
  drinkLeft(service: any): number | null {
    if (service?.stockSourceUid) {
      return Math.floor((service.sourceStockQuantity ?? 0) / (service.unitsPerSale || 1));
    }
    return service?.trackStock ? (service.stockQuantity ?? 0) : null;
  }

  /** Tapped in the search: onto the open bill's order, through the same add-item dialog. */
  pickDrink(service: any): void {
    const bill = this.selectedBill;
    if (!bill) {
      this.alertService.show('error', this.translate.instant('STAFF_SELL_PAGE.DRINK_PICK_BILL'));
      return;
    }
    this.addToBill(bill, service);
  }

  ordersFor(bill: SalesOpened, status: StaffOrder['status']): StaffOrder[] {
    return this.orders.filter((o) => o.salesOpenedUid === bill.uid && o.status === status);
  }

  hasOrders(bill: SalesOpened): boolean {
    return this.orders.some((o) => o.salesOpenedUid === bill.uid);
  }

  // ---- One bill at a time: picked from a list, closed again once sent ----

  /** The bill open below the picker; null = only the picker shows. */
  selectedUid: string | null = null;
  pickerOpen = false;
  pickerSearch = '';

  get selectedBill(): SalesOpened | null {
    return this.bills.find((b) => b.uid === this.selectedUid) ?? null;
  }

  /** What the card area shows: the chosen bill, or nothing. */
  get shownBills(): SalesOpened[] {
    const b = this.selectedBill;
    return b ? [b] : [];
  }

  /** The picker's rows, narrowed by bill number or nickname. */
  get pickerBills(): SalesOpened[] {
    const q = this.pickerSearch.trim().toLowerCase();
    if (!q) {
      return this.bills;
    }
    return this.bills.filter((b) =>
      (b.salesCode ?? '').toLowerCase().includes(q) || this.nicknames.get(b.uid).toLowerCase().includes(q));
  }

  togglePicker(): void {
    this.pickerOpen = !this.pickerOpen;
    if (!this.pickerOpen) {
      this.pickerSearch = '';
    }
  }

  selectBill(bill: SalesOpened): void {
    this.selectedUid = bill.uid ?? null;
    this.pickerOpen = false;
    this.pickerSearch = '';
  }

  closeBill(): void {
    this.selectedUid = null;
  }

  countOf(bill: SalesOpened, status: StaffOrder['status']): number {
    return this.ordersFor(bill, status).reduce((n, o) => n + (status === 'DRAFT' ? o.lines.length : 1), 0);
  }

  /** Lines written but not sent yet, across all bills. */
  get unsentCount(): number {
    return this.orders.filter((o) => o.status === 'DRAFT').reduce((n, o) => n + o.lines.length, 0);
  }

  get waitingCount(): number {
    return this.orders.filter((o) => o.status === 'SENT').length;
  }

  orderTotal(order: StaffOrder): number {
    return order.lines.reduce((sum, l) => sum + (l.unitPrice || 0) * l.quantity, 0);
  }

  private setOrders(orders: StaffOrder[] | undefined): void {
    const before = this.orders.filter((o) => o.status === 'SENT');
    this.orders = orders ?? [];
    this.tellDecided(before);
    if (this.waitingCount > 0) {
      this.startPoll();
    } else {
      this.stopPoll();
    }
  }

  private startPoll(): void {
    if (!this.poll) {
      // A fallback only: the live stream brings the supervisor's answer at once.
      this.poll = setInterval(() => this.refresh(true), 20000);
    }
  }

  private stopPoll(): void {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }

  /**
   * A staff member who signed in with their own code + PIN. They leave by
   * signing out (back to the login screen), and cannot switch to someone else.
   */
  get ownSession(): boolean {
    return this.auth.isStaffSession();
  }

  /** The counter's own bills (from "Bili zangu"): leaving goes back to its orders queue. */
  get counterSession(): boolean {
    return this.ownSession && isCounterSession();
  }

  /** Hand the screen back to the manager - only with a manager's login. */
  exitToPos(): void {
    if (this.counterSession) {
      const back = () => {
        returnFromCounterSession(this.auth);
        this.router.navigate(['/supervisor']);
      };
      if (this.unsentCount > 0) {
        this.sendOrders(back);
      } else {
        back();
      }
      return;
    }
    if (this.ownSession) {
      // Written orders go to the supervisor before they leave.
      if (this.unsentCount > 0) {
        this.sendOrders(() => this.signOut());
      } else {
        this.signOut();
      }
      return;
    }
    this.dialog.open(StaffSellUnlockDialog, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: true,
    }).afterClosed().subscribe((ok?: boolean) => {
      if (ok) {
        unlockStaffSell();
        // Home for whoever signed in: the Dashboard for a manager, POS for a cashier.
        this.router.navigate([landingFor((role) => this.auth.hasRole(role))]);
      }
    });
  }

  private signOut(): void {
    this.auth.removeToken();
    unlockStaffSell();
    this.router.navigate(['/login']);
  }

  /** New staff codes are four digits: the fourth one sends it, no extra tap. */
  private static readonly CODE_LENGTH = 4;
  /** Older staff still hold 3-digit codes: from three digits the Open button sends it. */
  static readonly MIN_CODE_LENGTH = 3;

  /** Enough digits for the Open button (or Enter) to look the code up. */
  get codeReady(): boolean {
    return this.code.trim().length >= BarStaffSell.MIN_CODE_LENGTH && !this.looking;
  }
  /** The on-screen keypad, in phone order. */
  readonly keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'];
  /** A touch screen: the code box is read-only so the device keyboard stays away - the keypad types. */
  readonly touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  press(digit: string): void {
    if (this.looking || this.code.length >= 10) {
      return;
    }
    this.code += digit;
    this.afterCodeChange();
  }

  backspace(): void {
    this.code = this.code.slice(0, -1);
    this.cdr.markForCheck();
  }

  clearCode(): void {
    this.code = '';
    this.cdr.markForCheck();
  }

  /** Typed on a real keyboard: digits only, and the fourth sends it too. */
  onCodeTyped(value: string): void {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits !== value) {
      this.code = digits;
    }
    this.afterCodeChange();
  }

  private afterCodeChange(): void {
    this.cdr.markForCheck();
    if (this.code.length === BarStaffSell.CODE_LENGTH) {
      this.findStaff();
    }
  }

  /** Code in: who is it, and what are they holding. None held - open one. */
  findStaff(then?: (name: string) => void): void {
    const code = this.code.trim();
    if (code.length < BarStaffSell.MIN_CODE_LENGTH || this.looking) {
      return;
    }
    this.looking = true;
    this.barService.findStaffSell(code).subscribe({
      next: (res) => {
        this.looking = false;
        if (!res?.data) {
          // The backend's message ("No staff member has code ...") is shown by the
          // interceptor; the box empties for another try.
          this.code = '';
          this.cdr.markForCheck();
          return;
        }
        this.staff = res.data.staff;
        this.bills = res.data.bills ?? [];
        this.setOrders(res.data.orders);
        this.billLines = {};
        this.bills.forEach((b) => this.loadLines(b));
        this.cdr.markForCheck();
        // No bill is opened for them: one left unused sat empty on the
        // Sales page. They open one with "Fungua bill" when a customer comes.
        then?.(res.data.staff?.name ?? '');
      },
      error: () => {
        this.looking = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Hand what was written to the supervisor, then back to the code screen for the next staff member. */
  switchStaff(): void {
    if (this.unsentCount > 0) {
      this.sendOrders(() => this.clearStaff());
    } else {
      this.clearStaff();
    }
  }

  /** Send what this staff member has written to the supervisor, staying on their bills. */
  sendOrders(then?: () => void): void {
    if (!this.staff || this.sending) {
      return;
    }
    this.sending = true;
    this.cdr.markForCheck();
    this.barService.sendStaffOrders(this.staff.staffCode).subscribe({
      next: (res) => {
        this.sending = false;
        if (res?.data !== undefined && res?.data !== null) {
          // Sent: a short rising two-note so the waiter knows it went.
          this.chime([784, 1175]);
          if (then) {
            then();
            return;
          }
          // Sent: the bill goes back into the list.
          this.closeBill();
          this.refresh();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.sending = false;
        this.cdr.markForCheck();
      },
    });
  }

  private clearStaff(): void {
    this.stopPoll();
    this.staff = null;
    this.bills = [];
    this.orders = [];
    this.billLines = {};
    this.code = '';
    this.cdr.markForCheck();
    if (!this.touch) {
      setTimeout(() => this.codeInput?.nativeElement.focus());
    }
  }

  /** Reload this staff member's bills - after a payment, or to pick up changes from the Sales page. */
  refresh(quiet = false): void {
    if (!this.staff) {
      return;
    }
    this.barService.findStaffSell(this.staff.staffCode, quiet).subscribe({
      next: (res) => {
        if (res?.data) {
          this.bills = res.data.bills ?? [];
          // Paid or deleted elsewhere: nothing to keep open.
          if (this.selectedUid && !this.bills.some((b) => b.uid === this.selectedUid)) {
            this.selectedUid = null;
          }
          this.setOrders(res.data.orders);
          this.bills.forEach((b) => this.loadLines(b));
        }
        this.cdr.markForCheck();
      },
    });
  }

  /** A new bill for this staff member; its code comes from theirs (K1-1, K1-2...). */
  openBill(): void {
    if (!this.staff || this.opening) {
      return;
    }
    this.opening = true;
    this.cdr.markForCheck();
    this.barService.openStaffBill({ staffCode: this.staff.staffCode }).subscribe({
      next: (opened) => {
        this.opening = false;
        if (opened?.data) {
          this.bills = [...this.bills, opened.data];
          this.billLines = { ...this.billLines, [opened.data.uid!]: [] };
          // A new bill is opened to sell on: straight to it.
          this.selectBill(opened.data);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.opening = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** preselect: a drink already found (the drink search) - the dialog opens at "how many". */
  addToBill(bill: SalesOpened, preselect?: any): void {
    if (!bill.uid || this.busyBill) {
      return;
    }
    this.dialog.open(SaleItemDialogComponent, {
      width: '560px',
      // No opening animation: at a busy till it has to be there at once.
      enterAnimationDuration: 0,
      exitAnimationDuration: 0,
      maxWidth: '95vw',
      autoFocus: false,
      data: { billCode: bill.salesCode, askServing: true, preselect },
    }).afterClosed().subscribe((result?: SaleItemResult) => {
      if (!result) {
        return;
      }
      this.busyBill = bill.uid!;
      this.cdr.markForCheck();
      // Onto the bill's order for the supervisor - not onto the bill.
      this.barService.addStaffOrderItem({
        salesOpenedUID: bill.uid!,
        barServiceUID: result.service.uid,
        quantity: result.quantity,
        serving: result.serving ?? null,
      }).subscribe({
        next: (res) => {
          this.busyBill = null;
          if (res?.data) {
            this.orders = [...this.orders.filter((o) => o.uid !== res.data.uid), res.data];
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.busyBill = null;
          this.cdr.markForCheck();
        },
      });
    });
  }

  /** Take a line off an order not yet sent. */
  removeLine(order: StaffOrder, lineUid: string): void {
    this.barService.removeStaffOrderLine(order.uid, lineUid).subscribe({
      next: (res) => {
        if (res?.data) {
          const rest = this.orders.filter((o) => o.uid !== order.uid);
          this.orders = res.data.lines?.length ? [...rest, res.data] : rest;
        }
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Look inside the bill and print it. Staff only sell here: paying (and
   * taking items off) happens at POS > Sales when they hand the money over.
   */
  viewBill(bill: SalesOpened): void {
    if (!bill.uid) {
      return;
    }
    this.barService.findBarSalesList(bill.uid).subscribe({
      next: (res) => {
        const services = res.data ?? [];
        this.billLines = { ...this.billLines, [bill.uid!]: services };
        this.cdr.markForCheck();
        this.dialog.open(SaleDetailsDialogComponent, {
          width: '650px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          panelClass: 'sale-details-dialog',
          autoFocus: false,
          data: { sale: bill, services, showPayment: false, canPay: false, previewReceipt: true, canExchange: true },
        }).afterClosed().subscribe((result?: { action?: string; service?: any }) => {
          this.cdr.markForCheck();
          if (result?.action === 'EXCHANGE' && result.service) {
            this.exchange(bill, result.service);
          }
        });
      },
    });
  }

  /**
   * Badilisho: the customer wanted something else instead of a line already
   * on the bill (a Serengeti Lite for the Castle Lite). Pick the new item;
   * the change goes straight to the station(s), marked, and the bill changes
   * when they receive it.
   */
  exchange(bill: SalesOpened, line: any): void {
    if (!bill.uid || !line?.uid || this.busyBill) {
      return;
    }
    const max = Math.max(1, Number(line.quantity) || 1);
    this.dialog.open(SaleItemDialogComponent, {
      width: '560px',
      enterAnimationDuration: 0,
      exitAnimationDuration: 0,
      maxWidth: '95vw',
      autoFocus: false,
      data: { billCode: bill.salesCode, askServing: true, exchange: { name: line.serviceName, max } },
    }).afterClosed().subscribe((result?: SaleItemResult) => {
      if (!result) {
        return;
      }
      const back = Math.min(max, Math.max(1, result.returnQuantity ?? max));
      this.busyBill = bill.uid!;
      this.cdr.markForCheck();
      this.barService.exchangeStaffOrder({
        barSalesUID: line.uid,
        returnQuantity: back,
        barServiceUID: result.service.uid,
        quantity: result.quantity,
        serving: result.serving ?? null,
      }).subscribe({
        next: (res) => {
          this.busyBill = null;
          if (res?.data?.length) {
            const uids = new Set(res.data.map((o) => o.uid));
            this.setOrders([...this.orders.filter((o) => !uids.has(o.uid)), ...res.data]);
            const place = res.data
              .map((o) => this.translate.instant(this.placeKey(o)))
              .join(' / ');
            this.alertService.show('success', this.translate.instant('STAFF_SELL_PAGE.EXCHANGE_SENT', {
              place,
              back: `${back} × ${line.serviceName}`,
              take: `${result.quantity} × ${result.service.serviceName}`,
            }));
          } else if (res?.message) {
            this.alertService.show('error', res.message);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.busyBill = null;
          this.cdr.markForCheck();
        },
      });
    });
  }

  /** Where an order is received, for the words on the screen. */
  private audio: AudioContext | null = null;
  private readonly wakeSound = () => {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') {
        this.audio.resume().catch(() => undefined);
      }
    } catch {
      // No sound on this device.
    }
  };

  /**
   * Orders that were waiting and now are not: received (a bright rising
   * chime and a note "ready") or turned back (a low double tone) - so the
   * waiter knows without watching the screen.
   */
  private tellDecided(before: StaffOrder[]): void {
    if (!before.length) {
      return;
    }
    const now = new Map(this.orders.map((o) => [o.uid, o]));
    const rejected = before.filter((o) => now.get(o.uid)?.status === 'REJECTED');
    const received = before.filter((o) => !now.has(o.uid) || now.get(o.uid)?.status === 'RECEIVED');
    if (received.length) {
      this.chime([1047, 1319, 1568, 2093]);
      const place = [...new Set(received.map((o) => this.translate.instant(this.placeKey(o))))].join(' / ');
      this.alertService.show('success', this.translate.instant('STAFF_SELL_PAGE.ORDER_READY', { place }));
    } else if (rejected.length) {
      this.chime([440, 330]);
    }
  }

  /** A short loud run of notes. */
  private chime(notes: number[]): void {
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }
      const loud = ctx.createDynamicsCompressor();
      loud.threshold.value = -30;
      loud.ratio.value = 20;
      loud.connect(ctx.destination);
      const t0 = ctx.currentTime + 0.05;
      for (let round = 0; round < 2; round++) {
        notes.forEach((freq, i) => {
          const at = t0 + round * (notes.length * 0.13 + 0.25) + i * 0.13;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.8, at + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
          osc.connect(gain).connect(loud);
          osc.start(at);
          osc.stop(at + 0.21);
        });
      }
    } catch {
      // No sound - the note on screen still says it.
    }
  }

  placeKey(order: StaffOrder): string {
    return 'STAFF_SELL_PAGE.PLACE_' + (order.station || 'COUNTER');
  }

  private loadLines(bill: SalesOpened): void {
    if (!bill.uid) {
      return;
    }
    this.barService.findBarSalesList(bill.uid).subscribe({
      next: (res) => {
        this.billLines = { ...this.billLines, [bill.uid!]: res.data ?? [] };
        this.cdr.markForCheck();
      },
    });
  }

  lineCount(bill: SalesOpened): number {
    return (this.billLines[bill.uid!] ?? []).reduce((sum, l) => sum + (Number(l.quantity) || 1), 0);
  }

  get total(): number {
    return this.bills.reduce((sum, b) => sum + (Number(b.bill) || 0), 0);
  }
}

/** A flavour in English or Swahili, so "ginger" also finds "Stoney Tangawizi". */
const FLAVOURS = [
  ['ginger', 'tangawizi'],
  ['lemon', 'lime', 'ndimu', 'limau'],
  ['orange', 'chungwa', 'machungwa'],
  ['pineapple', 'nanasi', 'mananasi'],
  ['mango', 'embe', 'maembe'],
  ['apple', 'tufaha'],
  ['passion', 'pasheni', 'karakara'],
  ['banana', 'ndizi'],
  ['coconut', 'nazi'],
  ['grape', 'zabibu'],
  ['watermelon', 'tikiti'],
  ['strawberry', 'stroberi'],
  ['sweet', 'tamu'],
  ['bitter', 'chungu'],
  ['sour', 'chachu'],
  ['coffee', 'kahawa'],
  ['honey', 'asali'],
  ['milk', 'maziwa'],
  ['water', 'maji'],
  ['juice', 'juisi', 'sharubati'],
  ['beer', 'bia'],
  ['wine', 'mvinyo', 'divai'],
  ['vanilla', 'vanila'],
  ['chocolate', 'chokoleti'],
  ['mint', 'nanaa'],
  ['cinnamon', 'mdalasini'],
];

/** The word and, when it is (the start of) a flavour, its other names. */
function flavourWords(word: string): string[] {
  if (word.length < 3) {
    return [word];
  }
  const group = FLAVOURS.filter((g) => g.some((t) => t.startsWith(word) || word.startsWith(t)));
  return [word, ...group.flat()];
}
