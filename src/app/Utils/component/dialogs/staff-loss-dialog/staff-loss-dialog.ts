import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { AlertService } from '../../../services/alert';

/**
 * A staff member's handover: what their bills came to against what they hand
 * in. A shortage is recorded against their commission (what they are owed
 * drops by it) and comes off the cashier's expected cash.
 */
@Component({
  selector: 'app-staff-loss-dialog',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './staff-loss-dialog.html',
  styleUrl: './staff-loss-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffLossDialog {
  expected: number | null;
  handed: number | null = null;
  note = '';
  saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { staffCode: string; staffName: string; expected: number },
    private dialogRef: MatDialogRef<StaffLossDialog>,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.expected = data.expected || null;
  }

  get loss(): number {
    return Math.max(0, (Number(this.expected) || 0) - (Number(this.handed) || 0));
  }

  get ready(): boolean {
    return !this.saving && this.handed !== null && (this.handed as any) !== '' && this.loss > 0;
  }

  save(): void {
    if (!this.ready) {
      return;
    }
    this.saving = true;
    this.barService.recordStaffLoss({
      staffCode: this.data.staffCode,
      expectedAmount: Math.round(Number(this.expected) || 0),
      handedAmount: Math.round(Number(this.handed) || 0),
      note: this.note.trim(),
    }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('STAFF_LOSS.SAVED', { amount: this.loss.toLocaleString(), name: this.data.staffName }));
          this.dialogRef.close(res.data);
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
