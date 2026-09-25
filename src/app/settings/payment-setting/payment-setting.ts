import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { AlertService } from '../../Utils/services/alert';
import { PaymentService, SubscriptionPayment, UnresolvedBranch } from './payment-service';
import { RevenueShareDialogComponent } from '../../Utils/component/dialogs/revenue-share-dialog-component/revenue-share-dialog-component';

@Component({
  selector: 'app-payment-setting',
  imports: [Title2, CommonModule, TranslatePipe],
  templateUrl: './payment-setting.html',
  styleUrl: './payment-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private paymentService: PaymentService,
    private alertService: AlertService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.payments = 'PAYMENT_SETTING_PAGE.RECEIVED_TAB';
    this.loadPayments();
    this.loadUnresolved();
    this.loadBalance();
    this.loadTotals();
  }

  titleAction: string = 'PAYMENT_SETTING_PAGE.TITLE';
  payments: string = '';

  titleActions = [
    { icon: 'payment', title: 'PAYMENT_SETTING_PAGE.RECEIVED_TAB', roles: ['ROOT', 'DIRECTOR'] },
    { icon: 'warning', title: 'PAYMENT_SETTING_PAGE.UNRESOLVED_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.payments = action;
  }

  paymentList: SubscriptionPayment[] = [];
  unresolvedList: UnresolvedBranch[] = [];

  isLoading = false;
  isLoadingUnresolved = false;

  /** Only the row being reconciled is disabled, so the rest stay clickable. */
  reconcilingUid: string | null = null;

  /** null means Snippe didn't answer - the card says so instead of showing 0. */
  balance: number | null = null;

  /** Across every payment ever recorded, not just the page on screen. */
  totals = { payments: 0, totalAmount: 0, totalCommission: 0, thisMonth: 0 };

  /** Summed over the page on screen; the backend has no grand-total endpoint. */
  pageAmount = 0;

  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageNumbers: number[] = [];

  loadPayments() {
    this.isLoading = true;
    this.paymentService
      .findPaymentPage({ page: this.currentPage, size: this.pageSize })
      .subscribe({
        next: (response) => {
          this.paymentList = response.data || [];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i);
          this.pageAmount = this.paymentList.reduce((sum, payment) => sum + (payment.amount || 0), 0);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.paymentList = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.pageNumbers = [];
          this.pageAmount = 0;
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadUnresolved() {
    this.isLoadingUnresolved = true;
    this.paymentService.findUnresolvedPayments().subscribe({
      next: (response) => {
        this.unresolvedList = response.data || [];
        this.isLoadingUnresolved = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.unresolvedList = [];
        this.isLoadingUnresolved = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadTotals() {
    this.paymentService.findPaymentTotals().subscribe({
      next: (response) => {
        this.totals = response.data ?? { payments: 0, totalAmount: 0, totalCommission: 0, thisMonth: 0 };
        this.cdr.markForCheck();
      },
      error: () => {
        this.totals = { payments: 0, totalAmount: 0, totalCommission: 0, thisMonth: 0 };
        this.cdr.markForCheck();
      }
    });
  }

  loadBalance() {
    this.paymentService.findBalance().subscribe({
      next: (response) => {
        this.balance = response.data ?? null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.balance = null;
        this.cdr.markForCheck();
      }
    });
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadPayments();
  }

  /** The dialog fetches the split itself, so nothing is passed to it. */
  openRevenueShare() {
    this.dialog.open(RevenueShareDialogComponent, {
      width: '560px',
      maxHeight: '85vh'
    });
  }

  refresh() {
    this.currentPage = 0;
    this.loadPayments();
    this.loadUnresolved();
    this.loadBalance();
    this.loadTotals();
  }

  reconcile(branchUid: string) {
    if (this.reconcilingUid) {
      return;
    }
    this.reconcilingUid = branchUid;
    this.cdr.markForCheck();

    this.paymentService.reconcile(branchUid).subscribe({
      next: (response) => {
        this.reconcilingUid = null;
        this.alertService.show(
          'success',
          response.data || response.message || 'Done'
        );
        // A reconciled payment leaves the unresolved list and joins the paid
        // one, and the balance moves with it.
        this.loadPayments();
        this.loadUnresolved();
        this.loadBalance();
    this.loadTotals();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.reconcilingUid = null;
        this.alertService.show(
          'error',
          err?.error?.message || 'Failed to reconcile'
        );
        this.cdr.markForCheck();
      }
    });
  }
}
