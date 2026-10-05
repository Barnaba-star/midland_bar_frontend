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
import { LiveChanges } from '../../Utils/services/live-changes';
import { landingFor } from '../../login/landing-for';
import { Authentication } from '../../Utils/services/authentication';
import { SalesOpened, StaffOrder, StaffSellStaff } from '../BarModel';

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
  imports: [ShiftBar, EmptyStateComponent, MatIconModule, FormsModule, DecimalPipe, TranslatePipe],
  templateUrl: './bar-staff-sell.html',
  styleUrl: './bar-staff-sell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStaffSell implements OnInit, OnDestroy {
  @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;

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
    // From here on the till stays in Staff Sell until a manager lets it out.
    lockStaffSell();
    // Signed in with their own code + PIN: straight to their bills, no keypad.
    if (this.ownSession) {
      this.code = this.auth.getStaffCode();
      this.findStaff();
    }
    // The add-item list, loaded before the first tap.
    this.sellable.prefetch();
    // Orders and bills made offline have reached the server: read them again.
    this.offline.synced.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh(true));
    // The supervisor received or rejected, or a bill moved at the till: show it at once.
    this.liveChanges.on('orders', 'bills').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh(true));
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
    this.stopPoll();
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
    this.orders = orders ?? [];
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

  /** Hand the screen back to the manager - only with a manager's login. */
  exitToPos(): void {
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

  /** Staff codes are three digits: the third one sends it, no extra tap. */
  private static readonly CODE_LENGTH = 3;
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

  /** Typed on a real keyboard: digits only, and the third sends it too. */
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
  findStaff(): void {
    const code = this.code.trim();
    if (!code || this.looking) {
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
        if (this.bills.length === 0) {
          this.openBill();
        }
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

  addToBill(bill: SalesOpened): void {
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
      data: { billCode: bill.salesCode },
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
          data: { sale: bill, services, showPayment: false, canPay: false, previewReceipt: true },
        }).afterClosed().subscribe(() => this.cdr.markForCheck());
      },
    });
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
