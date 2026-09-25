import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';

import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-sale-details-dialog-component',

  imports: [
    MatIcon,
    FormsModule, DecimalPipe
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
    }
  ) {}


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
