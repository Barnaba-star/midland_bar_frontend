import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { AlertService } from '../../../services/alert';
import { SalesOpened } from '../../../../pos/BarModel';

/** The ways a customer can pay without handing over cash. */
export const NOTE_METHODS = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];

/**
 * "This bill was paid by phone, from this name": noted on an unpaid bill so
 * the cashier can check the money came in when the staff member hands over.
 * It marks nothing as paid. Closes with the updated bill.
 */
@Component({
  selector: 'app-payment-note-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './payment-note-dialog.html',
  styleUrl: './payment-note-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentNoteDialog {
  readonly methods = NOTE_METHODS;
  method: string;
  payer: string;
  reference: string;
  saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { bill: SalesOpened },
    private dialogRef: MatDialogRef<PaymentNoteDialog, SalesOpened>,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.method = data.bill.paymentNoteMethod || 'mpesa';
    this.payer = data.bill.paymentNotePayer || '';
    this.reference = data.bill.paymentNoteRef || '';
  }

  get hasNote(): boolean {
    return !!this.data.bill.paymentNoteMethod;
  }

  get ready(): boolean {
    return !this.saving && !!this.method && this.payer.trim().length > 0;
  }

  save(): void {
    if (this.ready) {
      this.send({ method: this.method, payerName: this.payer.trim(), reference: this.reference.trim() }, 'PAYMENT_NOTE.SAVED');
    }
  }

  remove(): void {
    this.send({ method: '', payerName: '', reference: '' }, 'PAYMENT_NOTE.REMOVED');
  }

  private send(body: { method: string; payerName: string; reference: string }, okKey: string): void {
    this.saving = true;
    this.barService.savePaymentNote(this.data.bill.uid!, body).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant(okKey, { code: this.data.bill.salesCode }));
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
