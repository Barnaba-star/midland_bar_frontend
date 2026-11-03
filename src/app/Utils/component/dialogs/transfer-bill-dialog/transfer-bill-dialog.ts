import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { AlertService } from '../../../services/alert';
import { SalesOpened, StaffColleague } from '../../../../pos/BarModel';

/**
 * "Hamisha bill": a staff member going off hands an unpaid bill to a
 * colleague staying on with the customer. The bill, what is on it and its
 * commission become the colleague's. Closes with the moved bill.
 */
@Component({
  selector: 'app-transfer-bill-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe, DecimalPipe],
  templateUrl: './transfer-bill-dialog.html',
  styleUrl: './transfer-bill-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferBillDialog implements OnInit {
  colleagues: StaffColleague[] = [];
  loading = true;
  query = '';
  chosen: StaffColleague | null = null;
  reason = '';
  saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { bill: SalesOpened },
    private dialogRef: MatDialogRef<TransferBillDialog, SalesOpened>,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.barService.staffColleagues(this.data.bill.staffUid ?? undefined).subscribe({
      next: (res) => {
        this.colleagues = res?.data ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get shown(): StaffColleague[] {
    const q = this.query.trim().toLowerCase();
    return q ? this.colleagues.filter((c) => c.name.toLowerCase().includes(q)) : this.colleagues;
  }

  pick(c: StaffColleague): void {
    if (!c.handoverSent) {
      this.chosen = c;
    }
  }

  move(): void {
    if (!this.chosen || this.saving) {
      return;
    }
    const to = this.chosen;
    this.saving = true;
    this.barService.transferStaffBill({ billUid: this.data.bill.uid!, toStaffUid: to.uid, reason: this.reason.trim() }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('BILL_TRANSFER.DONE', {
            code: this.data.bill.salesCode, name: to.name, newCode: res.data.salesCode,
          }));
          this.dialogRef.close(res.data);
        } else if (res?.message) {
          this.alert.show('error', res.message);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
