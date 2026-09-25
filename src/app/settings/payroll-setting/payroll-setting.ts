import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { Payroll, PayrollLine, PayrollService } from './payroll-service';

/** A month the filter can pick, already named in the language in use. */
interface MonthOption {
  value: number;
  label: string;
}

/** A line with its place on the sheet. */
interface PayrollRow extends PayrollLine {
  /** Runs 1..n across the whole sheet, not restarting per role - a bank
      counts the rows it is given, not the rows in a section. */
  no: number;
}

/**
 * The month's share-out as a sheet to hand to a bank.
 *
 * It shows what is still owed rather than what was earned. The two are the
 * same until somebody is paid, and after that the difference is the whole
 * point: a schedule listing what people earned would pay the settled ones a
 * second time.
 */
@Component({
  selector: 'app-payroll-setting',
  imports: [Title2, CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './payroll-setting.html',
  styleUrl: './payroll-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private payrollService: PayrollService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  titleActions = [
    { icon: 'pay', title: 'PAYROLL_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  tab = '';

  payroll: Payroll | null = null;
  rows: PayrollRow[] = [];
  loading = true;
  failed = false;

  months: MonthOption[] = [];
  years: number[] = [];
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();

  ngOnInit(): void {
    this.tab = 'PAYROLL_PAGE.MANAGE_TAB';
    this.buildPeriodOptions();
    this.load();
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string): void {
    this.tab = action;
  }

  private buildPeriodOptions(): void {
    const lang = this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en';
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat(lang, { month: 'long' });
    } catch {
      // An unknown tag would throw; English month names beat none.
      formatter = new Intl.DateTimeFormat('en', { month: 'long' });
    }

    const months: MonthOption[] = [];
    for (let m = 1; m <= 12; m++) {
      months.push({ value: m, label: formatter.format(new Date(2000, m - 1, 1)) });
    }
    this.months = months;

    // Nothing was earned before the platform existed, so the list starts at
    // this year and only grows backwards as years pass.
    const thisYear = new Date().getFullYear();
    this.years = [thisYear, thisYear - 1, thisYear - 2];
  }

  onMonthChange(value: string): void {
    this.selectedMonth = Number(value);
    this.load();
  }

  onYearChange(value: string): void {
    this.selectedYear = Number(value);
    this.load();
  }

  private load(): void {

    this.loading = true;
    this.failed = false;
    // The old sheet belongs to another month, so it goes rather than sitting
    // under a heading that no longer describes it.
    this.payroll = null;
    this.rows = [];

    this.payrollService.findPayroll(this.selectedYear, this.selectedMonth).subscribe({

      next: (res) => {
        this.loading = false;
        this.payroll = res?.data ?? null;
        this.rows = this.numbered(this.payroll?.lines ?? []);
        this.cdr.markForCheck();
      },

      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * The backend already returns the lines in role order, so nothing here
   * sorts or groups them - only numbers them for the sheet.
   */
  private numbered(lines: PayrollLine[]): PayrollRow[] {
    return lines.map((line, index) => ({ ...line, no: index + 1 }));
  }

  /**
   * Who is holding the sheet up. Named rather than counted: the warning
   * exists so somebody can be chased, and a number cannot be chased. The
   * line still carries the person's name even though the sheet no longer
   * shows a column for it - a bank reads the account name, but whoever
   * prepares this needs to know whose row is blank.
   */
  get incompleteNames(): string {
    return (this.payroll?.lines ?? [])
      .filter(line => line.toPay > 0)
      .filter(line => !line.accountNumber || !line.bankName || !line.accountName)
      .map(line => line.name)
      .join(', ');
  }

  /**
   * A role's percentage, and - when more than one person holds it - that it
   * is divided rather than repeated. Matches the Payments screen, which says
   * the same thing the same way.
   */
  sharedPercent(percent: number, holders: number): string {
    return holders > 1 ? `${percent}% \u00f7 ${holders}` : `${percent}%`;
  }

  get periodLabel(): string {
    const month = this.months.find(m => m.value === this.selectedMonth);
    return `${month ? month.label : this.selectedMonth} ${this.selectedYear}`;
  }

  print(): void {
    window.print();
  }
}
