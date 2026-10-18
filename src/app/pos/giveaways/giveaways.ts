import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';

type Range = 'DAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH';

/**
 * Reports > Ofa na Punguzo: what the bar gave away or took off in a period,
 * kept apart from sales - sales everywhere are what was charged; this is
 * what was not (happy hours / offers, bill discounts, customers' offers,
 * refunds), each with its lines.
 */
@Component({
  selector: 'app-giveaways',
  imports: [DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './giveaways.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Giveaways implements OnInit {
  private bar = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);

  readonly ranges: Range[] = ['DAY', 'YESTERDAY', 'WEEK', 'MONTH', 'LAST_MONTH'];
  range: Range = 'DAY';
  data: any = null;

  ngOnInit(): void {
    this.load();
  }

  setRange(r: Range): void {
    this.range = r;
    this.load();
  }

  load(): void {
    this.bar.findGiveaways(this.range).subscribe((res) => {
      this.data = res?.data ?? null;
      this.cdr.markForCheck();
    });
  }
}
