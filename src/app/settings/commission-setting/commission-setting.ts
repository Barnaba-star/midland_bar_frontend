import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { CommissionService } from './commission-service';
import { StaffCommission, SubscriptionPayment } from './commission-model';
import { PayCommissionDialogComponent } from '../../Utils/component/dialogs/pay-commission-dialog-component/pay-commission-dialog-component';
import { StaffBranchesDialogComponent } from '../../Utils/component/dialogs/staff-branches-dialog-component/staff-branches-dialog-component';
import { AlertService } from '../../Utils/services/alert';
import { Authentication } from '../../Utils/services/authentication';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';

@Component({
  selector: 'app-commission-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, TranslatePipe, Title2, SearchBoxComponent],
  templateUrl: './commission-setting.html',
  styleUrls: ['./commission-setting.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommissionSetting implements OnInit {

  constructor(
    private commissionService: CommissionService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private alert: AlertService,
    private translate: TranslateService,
    private auth: Authentication
  ) {
    // Resolved once here rather than as field initialisers (those run before
    // the injected `auth` is assigned) and rather than as getters (each call
    // decodes the JWT, and a template getter runs on every change detection).
    this.seesAllStaff = auth.hasRole('ROOT') || auth.hasRole('DIRECTOR');

    this.canPay =
      auth.hasRole('ROOT') ||
      (auth.getPermissions() || '').split(',').includes('PAY_COMMISSION');
  }

  // ROOT and DIRECTOR see every staff member; STAFF only ever get their own
  // row back. Mirrors CommissionService.seesAllStaff() - this only changes
  // what the page SAYS, the backend is what actually narrows the data.
  readonly seesAllStaff: boolean;

  // Paying is ROOT-only by default. The ROOT role is seeded with no
  // permissions at all (it passes via hasPermissionOrRoot), so the role has
  // to be checked separately from the permission.
  readonly canPay: boolean;

  ngOnInit(): void {
    this.loadReport();
  }

  titleActions: any[] = [];

  report: StaffCommission[] = [];
  loading = false;

  // The month being reported on. Defaults to the current one, which is what
  // you want when paying out at month end.
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  months = [
    { value: 1,  label: 'MONTHS.JANUARY' },
    { value: 2,  label: 'MONTHS.FEBRUARY' },
    { value: 3,  label: 'MONTHS.MARCH' },
    { value: 4,  label: 'MONTHS.APRIL' },
    { value: 5,  label: 'MONTHS.MAY' },
    { value: 6,  label: 'MONTHS.JUNE' },
    { value: 7,  label: 'MONTHS.JULY' },
    { value: 8,  label: 'MONTHS.AUGUST' },
    { value: 9,  label: 'MONTHS.SEPTEMBER' },
    { value: 10, label: 'MONTHS.OCTOBER' },
    { value: 11, label: 'MONTHS.NOVEMBER' },
    { value: 12, label: 'MONTHS.DECEMBER' },
  ];

  // The platform started in 2026; no point offering months that cannot
  // possibly hold a payment.
  get years(): number[] {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current; y >= 2026; y--) {
      list.push(y);
    }
    return list;
  }

  // What the search box last sent out; it narrows the report server-side.
  searchTerm = '';

  loadReport(): void {
    this.loading = true;
    this.expandedStaffUid = null;

    this.commissionService.findStaffCommissionReport(this.year, this.month, this.searchTerm).subscribe({
      next: (res) => {
        this.report = res?.data ?? [];
        this.recomputeTotals();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Commission report error:', error);
        this.report = [];
        this.recomputeTotals();
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onPeriodChange(): void {
    this.loadReport();
  }

  // loadReport() recomputes the summary tiles, so they follow the search.
  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadReport();
  }

  // Summary tiles. Plain fields rather than getters: a getter walks the whole
  // report on every change detection pass, and the figures can only move when
  // a new report lands - so they are worked out once, here.
  totalCollected = 0;
  totalCommission = 0;
  payingStaffCount = 0;
  totalOutstanding = 0;

  private recomputeTotals(): void {

    let collected = 0;
    let commission = 0;
    let outstanding = 0;
    let paying = 0;

    for (const row of this.report) {

      collected += row.totalCollected || 0;
      commission += row.commissionDue || 0;
      outstanding += row.outstanding || 0;

      if ((row.commissionDue || 0) > 0) {
        paying++;
      }
    }

    this.totalCollected = collected;
    this.totalCommission = commission;
    this.totalOutstanding = outstanding;
    this.payingStaffCount = paying;
  }

  // ------------------------------------------------------- branch breakdown

  openBranches(row: StaffCommission, event: MouseEvent): void {

    // the row click toggles the payments drill-down; this opens its own view
    event.stopPropagation();

    const monthLabel = this.months.find(m => m.value === this.month)?.label ?? '';

    this.translate.get(monthLabel).subscribe(monthName => {
      this.dialog.open(StaffBranchesDialogComponent, {
        width: '640px',
        maxWidth: '95vw',
        data: {
          staffUid: row.staffUid,
          staffName: row.staffName || '-',
          period: `${monthName} ${this.year}`,
          year: this.year,
          month: this.month,
        },
      });
    });
  }

  // ---------------------------------------------------------------- payout

  paying: string | null = null;

  payStaff(row: StaffCommission, event: MouseEvent): void {

    // the row itself toggles the drill-down; the button must not do both
    event.stopPropagation();

    if (!row.outstanding || this.paying) {
      return;
    }

    const monthLabel = this.months.find(m => m.value === this.month)?.label ?? '';

    this.translate.get(monthLabel).subscribe(monthName => {

      const dialogRef = this.dialog.open(PayCommissionDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          staffName: row.staffName || '-',
          period: `${monthName} ${this.year}`,
          amount: row.outstanding,
          branchesPaid: row.branchesPaid,
        },
      });

      dialogRef.afterClosed().subscribe(result => {

        if (!result) {
          return;
        }

        this.paying = row.staffUid;
        this.cdr.markForCheck();

        this.commissionService
          .payStaffCommission(row.staffUid, this.year, this.month, result.note)
          .subscribe({
            next: (res) => {
              this.paying = null;
              if (res?.data) {
                this.alert.show('success', this.translate.instant('COMMISSION_PAGE.PAID_SUCCESS'));
                // Reload rather than patch the row: another branch may have
                // paid in while the dialog was open, and the figures on
                // screen should be the ones the backend just acted on.
                this.loadReport();
              } else {
                this.alert.show('error', res?.message || this.translate.instant('COMMISSION_PAGE.PAID_FAILED'));
                this.loadReport();
              }
              this.cdr.markForCheck();
            },
            error: (error) => {
              this.paying = null;
              console.error('Commission payout error:', error);
              this.alert.show('error', error?.error?.message || this.translate.instant('COMMISSION_PAGE.PAID_FAILED'));
              this.cdr.detectChanges();
            },
          });
      });
    });
  }

  // ---------------------------------------------------------------- drill-down

  expandedStaffUid: string | null = null;
  staffPayments: SubscriptionPayment[] = [];
  loadingPayments = false;

  toggleStaff(row: StaffCommission): void {

    if (this.expandedStaffUid === row.staffUid) {
      this.expandedStaffUid = null;
      return;
    }

    // Nothing to break down - don't fire a request that can only come back empty.
    if (!row.payments) {
      this.expandedStaffUid = null;
      return;
    }

    this.expandedStaffUid = row.staffUid;
    this.staffPayments = [];
    this.loadingPayments = true;

    this.commissionService.findStaffPayments(row.staffUid, this.year, this.month).subscribe({
      next: (res) => {
        this.staffPayments = res?.data ?? [];
        this.loadingPayments = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Staff payments error:', error);
        this.staffPayments = [];
        this.loadingPayments = false;
        this.cdr.detectChanges();
      },
    });
  }
}
