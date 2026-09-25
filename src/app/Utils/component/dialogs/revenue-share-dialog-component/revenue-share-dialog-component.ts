import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PaymentService, RevenueShareDTO, ShareRecipientDTO } from '../../../../settings/payment-setting/payment-service';
import { PayShareDialogComponent } from '../pay-share-dialog-component/pay-share-dialog-component';
import { AlertService } from '../../../services/alert';

/** One line of the split: what it is called, its share, and what that comes to. */
interface ShareRow {
  label: string;
  amount: number;
  color: string;
  /** Already-built text like "10%" or "10% x 3"; empty for running costs. */
  percentText: string;
  /** Running costs are the remainder, so they sit apart from the three shares. */
  remainder: boolean;
  /** The backend role behind the row, or null when the row is not somebody's share. */
  role: string | null;
}

/** A month the filter can pick, already named in the language in use. */
interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-revenue-share-dialog-component',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './revenue-share-dialog-component.html',
  styleUrl: './revenue-share-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RevenueShareDialogComponent implements OnInit {

  share: RevenueShareDTO | null = null;
  rows: ShareRow[] = [];
  isLoading = false;

  /** Built from year and month so the date pipe can name the month. */
  monthDate: Date | null = null;

  /** Filter state - the month being looked at. */
  months: MonthOption[] = [];
  years: number[] = [];
  selectedMonth: number;
  selectedYear: number;

  /** The one row whose people are on show, or null when all are folded away. */
  expandedRole: string | null = null;
  /** Held per role so folding a row open twice does not fetch it twice. */
  private recipientsByRole = new Map<string, ShareRecipientDTO[]>();
  recipientsLoadingRole: string | null = null;

  /**
   * The one person whose payout is being written down, so only their button
   * goes dead while the rest of the list stays usable.
   */
  payingUid: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RevenueShareDialogComponent>,
    private paymentService: PaymentService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear = now.getFullYear();
  }

  ngOnInit(): void {
    this.buildMonths();
    this.buildYears();
    this.load();
  }

  /** Month names come from the browser, so no twelve keys need translating. */
  private buildMonths(): void {
    const lang = this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en';
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat(lang, { month: 'long' });
    } catch {
      // An unknown tag would throw; English is better than no month names.
      formatter = new Intl.DateTimeFormat('en', { month: 'long' });
    }
    const months: MonthOption[] = [];
    for (let i = 0; i < 12; i++) {
      const label = formatter.format(new Date(2000, i, 1));
      months.push({
        value: i + 1,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      });
    }
    this.months = months;
  }

  /** 2026 is where the books start, but a clock set earlier must still pick its own year. */
  private buildYears(): void {
    const current = new Date().getFullYear();
    const first = Math.min(2026, current);
    const years: number[] = [];
    for (let year = first; year <= current; year++) {
      years.push(year);
    }
    this.years = years;
  }

  onMonthChange(value: string): void {
    this.selectedMonth = Number(value);
    this.onFilterChange();
  }

  onYearChange(value: string): void {
    this.selectedYear = Number(value);
    this.onFilterChange();
  }

  /** A new month makes every list stale, so they are dropped rather than left to mislead. */
  private onFilterChange(): void {
    this.expandedRole = null;
    this.recipientsLoadingRole = null;
    this.payingUid = null;
    this.recipientsByRole.clear();
    this.load();
  }

  load(): void {
    this.isLoading = true;
    // While it loads the old figures go away: they belong to another month.
    this.share = null;
    this.rows = [];
    this.monthDate = null;
    this.cdr.markForCheck();

    this.paymentService.findRevenueShare(this.selectedYear, this.selectedMonth).subscribe({
      next: (response) => {
        this.share = response.data ?? null;
        this.rows = this.buildRows(this.share);
        this.monthDate = this.share
          ? new Date(this.share.year, Math.max(0, (this.share.month || 1) - 1), 1)
          : null;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // The interceptor already said what went wrong.
        this.share = null;
        this.rows = [];
        this.monthDate = null;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * A role's share, and - when more than one person holds it - that it is
   * divided rather than repeated. With a single holder the division is
   * noise, so it is left off.
   */
  private sharedPercent(percent: number, holders: number): string {
    return holders > 1 ? `${percent}% ÷ ${holders}` : `${percent}%`;
  }

  private buildRows(share: RevenueShareDTO | null): ShareRow[] {
    if (!share) {
      return [];
    }
    return [
      {
        label: 'REVENUE_SHARE_DIALOG.STAFF',
        amount: share.staffAmount || 0,
        color: '#2a78d6',
        percentText: `${share.staffPercent}%`,
        remainder: false,
        role: 'STAFF'
      },
      {
        label: 'REVENUE_SHARE_DIALOG.DIRECTORS',
        amount: share.directorAmount || 0,
        color: '#eb6834',
        // "20% ÷ 2", not "20% × 2": one share for the role, divided. The
        // multiplication sign said the opposite of what happens.
        percentText: this.sharedPercent(share.directorPercent, share.directorCount),
        remainder: false,
        role: 'DIRECTOR'
      },
      {
        label: 'REVENUE_SHARE_DIALOG.ROOT',
        amount: share.rootAmount || 0,
        color: '#1baf7a',
        percentText: this.sharedPercent(share.rootPercent, share.rootCount),
        remainder: false,
        role: 'ROOT'
      },
      {
        // Running costs are not anybody's share, so there is nobody to list.
        label: 'REVENUE_SHARE_DIALOG.OPERATING',
        amount: share.operatingAmount || 0,
        color: '#94a3b8',
        percentText: '',
        remainder: true,
        role: null
      }
    ];
  }

  /** Opens the row, or closes it if it was the one already open. */
  toggleRecipients(role: string | null): void {
    if (!role) {
      return;
    }
    if (this.expandedRole === role) {
      this.expandedRole = null;
      this.cdr.markForCheck();
      return;
    }
    this.expandedRole = role;
    this.cdr.markForCheck();
    // Only fetched when somebody asks for it, and only the first time.
    if (!this.recipientsByRole.has(role)) {
      this.loadRecipients(role);
    }
  }

  private loadRecipients(role: string): void {
    this.recipientsLoadingRole = role;
    this.cdr.markForCheck();
    this.paymentService.findShareRecipients(role, this.selectedYear, this.selectedMonth).subscribe({
      next: (response) => {
        this.recipientsByRole.set(role, response.data ?? []);
        if (this.recipientsLoadingRole === role) {
          this.recipientsLoadingRole = null;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        // The interceptor already said what went wrong; an empty list reads as "nobody".
        this.recipientsByRole.set(role, []);
        if (this.recipientsLoadingRole === role) {
          this.recipientsLoadingRole = null;
        }
        this.cdr.markForCheck();
      }
    });
  }

  recipientsFor(role: string | null): ShareRecipientDTO[] {
    return (role && this.recipientsByRole.get(role)) || [];
  }

  isRecipientsLoading(role: string | null): boolean {
    return !!role && this.recipientsLoadingRole === role;
  }

  /** Empty only counts once the fetch has come back, or it flashes "nobody" while loading. */
  isRecipientsEmpty(role: string | null): boolean {
    return !!role
      && this.recipientsLoadingRole !== role
      && this.recipientsByRole.has(role)
      && this.recipientsByRole.get(role)!.length === 0;
  }

  /** True only for the row whose payout is in flight, so one button at a time goes dead. */
  isPaying(uid: string): boolean {
    return this.payingUid === uid;
  }

  /**
   * Asks how much is being handed over, then writes that down. Nothing is sent
   * to anybody - this only records it, which is why the dialog says so in as
   * many words.
   *
   * The button is not hidden for non-ROOT users: the backend is the one that
   * decides who may record a DIRECTOR or ROOT payout, and its refusal is shown
   * as it came.
   */
  payShare(role: string | null, recipient: ShareRecipientDTO): void {
    if (!role || !recipient || this.payingUid) {
      return;
    }

    const dialogRef = this.dialog.open(PayShareDialogComponent, {
      width: '460px',
      data: {
        name: recipient.name,
        amount: recipient.amount,
        paid: recipient.paid,
        outstanding: recipient.outstanding
      }
    });

    // Closed with nothing means it was called off; anything else is the amount.
    dialogRef.afterClosed().subscribe((amount) => {
      if (typeof amount !== 'number' || !(amount > 0)) {
        return;
      }
      this.sendPayShare(role, recipient.uid, amount);
    });
  }

  private sendPayShare(role: string, uid: string, amount: number): void {
    this.payingUid = uid;
    this.cdr.markForCheck();

    this.paymentService
      .payShare(role, uid, this.selectedYear, this.selectedMonth, undefined, amount)
      .subscribe({
        next: (response) => {
          this.payingUid = null;

          // Everything comes back as 200, so a refusal is told apart by having
          // no data. What comes back is a code, never a sentence - the wording
          // belongs here, where it is translated.
          const recorded = response?.data;
          if (typeof recorded !== 'number' || recorded <= 0) {
            this.cdr.markForCheck();
            this.alertService.show('error', this.messageForCode(response?.message));
            return;
          }

          // Applied to the row in hand rather than refetched: the only things
          // that moved are this person's paid and outstanding, and the server
          // has just told us by exactly how much. A round trip would show the
          // same numbers a moment later.
          this.applyPayment(role, uid, recorded);

          this.alertService.show('success', this.translate.instant('REVENUE_SHARE_DIALOG.PAY_RECORDED', {
            amount: recorded.toLocaleString('en-US')
          }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.payingUid = null;
          this.alertService.show('error', this.messageForCode(null));
          this.cdr.markForCheck();
        }
      });
  }

  /** Moves one person's figures without going back to the server. */
  private applyPayment(role: string, uid: string, paid: number): void {
    const list = this.recipientsByRole.get(role);
    if (!list) {
      return;
    }
    this.recipientsByRole.set(role, list.map(person =>
      person.uid === uid
        ? { ...person, paid: person.paid + paid, outstanding: Math.max(0, person.outstanding - paid) }
        : person
    ));
  }

  /**
   * The backend answers in codes so this screen can say it in the reader's
   * language. An unrecognised code still gets a sentence rather than showing
   * the code itself.
   */
  private messageForCode(code: string | null | undefined): string {
    const known = ['ALREADY_PAID', 'NOTHING_EARNED', 'MORE_THAN_OWED', 'INVALID_AMOUNT', 'NOT_ALLOWED', 'NOT_IN_ROLE'];
    const key = code && known.includes(code) ? code : 'PAY_FAILED';
    return this.translate.instant('REVENUE_SHARE_DIALOG.' + key);
  }

  /** How wide the little proportion bar should be, capped so it can never overflow. */
  barWidth(amount: number): number {
    const revenue = this.share?.revenue || 0;
    if (revenue <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, (amount / revenue) * 100));
  }

  get hasRevenue(): boolean {
    return (this.share?.revenue || 0) > 0;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
