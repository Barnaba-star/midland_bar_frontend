import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';

type Range = 'DAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'THIS_YEAR';

/**
 * Reports > Ofa za wateja: the regular-customer offer in a period - big bills
 * each customer paid, offers they earned and spent, and what they hold now.
 */
@Component({
  selector: 'app-loyalty-report',
  imports: [DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './loyalty-report.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltyReport implements OnInit {
  private bar = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);

  readonly ranges: Range[] = ['DAY', 'YESTERDAY', 'WEEK', 'MONTH', 'LAST_MONTH', 'THIS_YEAR'];
  range: Range = 'MONTH';
  data: any = null;

  ngOnInit(): void {
    this.load();
  }

  setRange(r: Range): void {
    this.range = r;
    this.load();
  }

  load(): void {
    this.bar.loyaltyReport(this.range).subscribe((res) => {
      this.data = res?.data ?? null;
      this.cdr.markForCheck();
    });
  }
}
