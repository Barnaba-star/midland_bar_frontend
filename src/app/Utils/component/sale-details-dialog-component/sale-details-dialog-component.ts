import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';

import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ReceiptDialogComponent } from '../dialogs/receipt-dialog-component/receipt-dialog-component';

@Component({
  selector: 'app-sale-details-dialog-component',

  imports: [
    MatIcon,
    FormsModule, DecimalPipe, TranslatePipe
  ],

  templateUrl: './sale-details-dialog-component.html',
  styleUrl: './sale-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaleDetailsDialogComponent {

  constructor(
    private dialogRef:
      MatDialogRef<SaleDetailsDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: {
      sale: any;
      services: any[];
      showPayment: boolean;
      /** An open bill: offer Lipa here instead of on its card. */
      canPay?: boolean;
    },
    private dialog: MatDialog
  ) {}

  get payable(): boolean {
    return !!this.data.canPay
      && this.data.sale?.paymentStatus !== 'PAID'
      && this.data.services.length > 0
      && this.getTotal() > 0;
  }

  /** The bill as it stands - a pro-forma until it is paid - over this dialog. */
  print() {
    if (!this.data.sale?.uid) {
      return;
    }
    this.dialog.open(ReceiptDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { billUid: this.data.sale.uid },
    });
  }

  /** The page runs the payment, so a paid bill leaves its list. */
  pay() {
    this.dialogRef.close({ action: 'PAY' });
  }


  selectedPaymentMethod = '';


  close() {
    this.dialogRef.close();
  }


  getTotal(): number {

    return this.data.services.reduce(
      (total, service) =>
        total + Number(service.lineTotal ?? service.price ?? 0),
      0
    );

  }


  selectPaymentMethod(method: string) {

    this.selectedPaymentMethod = method;

  }


  confirmPayment() {

    if (!this.selectedPaymentMethod) {
      return;
    }

    this.dialogRef.close({
      action: 'PAYMENT',
      paymentMethod: this.selectedPaymentMethod
    });

  }

}
