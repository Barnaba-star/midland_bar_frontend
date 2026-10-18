import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SystemSettingService } from '../../Utils/services/system-setting';
import { AlertService } from '../../Utils/services/alert';
import { TranslateService } from '@ngx-translate/core';

/**
 * POS Setting > Tawi (CEO): the branch's TRA details printed on receipts,
 * how much a cashier may discount on their own, and when the CEO is alerted
 * (items taken off bills in a shift, a short cash-up, a shift left open).
 */
@Component({
  selector: 'app-branch-rules',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './branch-rules.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchRules implements OnInit {
  private settings = inject(SystemSettingService);
  private alert = inject(AlertService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  form = {
    taxTin: '', taxVrn: '', efdSerial: '',
    cashierDiscountPercent: 10, alertVoidsPerShift: 5, alertShortageAmount: 10000, alertShiftHours: 14,
  };
  saving = false;

  ngOnInit(): void {
    this.settings.getLogo().subscribe((res) => {
      const d = res?.data;
      if (d) {
        this.form = {
          taxTin: d.taxTin ?? '', taxVrn: d.taxVrn ?? '', efdSerial: d.efdSerial ?? '',
          cashierDiscountPercent: d.cashierDiscountPercent ?? 10,
          alertVoidsPerShift: d.alertVoidsPerShift ?? 5,
          alertShortageAmount: d.alertShortageAmount ?? 10000,
          alertShiftHours: d.alertShiftHours ?? 14,
        };
        this.cdr.markForCheck();
      }
    });
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.settings.saveBranch(this.form).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) this.alert.show('success', this.translate.instant('BRANCH_RULES.SAVED'));
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
