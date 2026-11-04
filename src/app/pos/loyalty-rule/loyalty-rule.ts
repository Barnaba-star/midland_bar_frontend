import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { LoyaltyRule } from '../BarModel';
import { AlertService } from '../../Utils/services/alert';

/**
 * The branch's customer loyalty rule, set by the boss, manager or cashier:
 * a bill of at least this much, this many of them within so many days, earn
 * this much ofa. Shown at the top of Madeni.
 */
@Component({
  selector: 'app-loyalty-rule',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './loyalty-rule.html',
  styleUrl: './loyalty-rule.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoyaltyRuleCard implements OnInit {
  private bar = inject(ServiceBarMethod);
  private alert = inject(AlertService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  rule: LoyaltyRule = { enabled: false, minBill: 100000, billsNeeded: 5, periodDays: 30, rewardAmount: 20000 };
  editing = false;
  saving = false;

  ngOnInit(): void {
    this.bar.loyaltyRule().subscribe({
      next: (res) => {
        if (res?.data) {
          this.rule = res.data;
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  save(): void {
    this.saving = true;
    this.bar.saveLoyaltyRule(this.rule).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.rule = res.data;
          this.editing = false;
          this.alert.show('success', this.translate.instant('LOYALTY.SAVED'));
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
