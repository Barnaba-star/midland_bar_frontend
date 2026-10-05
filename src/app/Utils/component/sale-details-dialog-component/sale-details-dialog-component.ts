import { Component, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef
} from '@angular/material/dialog';

import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../pos/service-bar-method';
import { AlertService } from '../../services/alert';
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
      /** Print shows the receipt first (as after paying on Sales), Print pressed there - Staff Sell. */
      previewReceipt?: boolean;
    },
    private dialog: MatDialog,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  /*
   * Taking an item off an open bill (a Castle that should have been a
   * Serengeti). The backend undoes the sale and keeps a record with the
   * reason; the lines here change in place, so the page's bill card and
   * counts follow without a reload.
   */
  removingUid: string | null = null;
  removeQty = 1;
  removeReason = '';
  removing = false;

  get canEdit(): boolean {
    return !!this.data.canPay && this.data.sale?.paymentStatus !== 'PAID';
  }

  startRemove(service: any): void {
    this.removingUid = service.uid;
    this.removeQty = Number(service.quantity) || 1;
    this.removeReason = '';
  }

  cancelRemove(): void {
    this.removingUid = null;
  }

  confirmRemove(service: any): void {
    const max = Number(service.quantity) || 1;
    const qty = Math.min(Math.max(1, Math.floor(Number(this.removeQty) || 1)), max);
    const reason = this.removeReason.trim();
    if (!reason || this.removing) {
      return;
    }
    this.removing = true;
    this.barService.removeBillLine({ barSalesUID: service.uid, quantity: qty, reason }).subscribe({
      next: (res) => {
        this.removing = false;
        if (res?.data) {
          const services = this.data.services;
          const index = services.indexOf(service);
          if (qty >= max) {
            if (index !== -1) {
              services.splice(index, 1);
            }
          } else {
            const unit = Number(service.unitPrice) || (Number(service.lineTotal ?? service.price) || 0) / max;
            service.quantity = max - qty;
            service.lineTotal = (Number(service.lineTotal ?? service.price) || 0) - unit * qty;
          }
          if (this.data.sale) {
            this.data.sale.bill = res.data.bill;
          }
          this.removingUid = null;
          this.alert.show('success', this.translate.instant('BILL_EDIT.REMOVED', { qty, name: service.serviceName }));
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.removing = false;
        this.cdr.markForCheck();
      },
    });
  }

  get payable(): boolean {
    return !!this.data.canPay
      && this.data.sale?.paymentStatus !== 'PAID'
      && this.data.services.length > 0
      && this.getTotal() > 0;
  }

  /**
   * Print the bill as it stands (a pro-forma until it is paid) straight away:
   * customer's and bar's copies in one job, no preview to click through. The
   * receipt dialog fetches it, prints and closes without being shown.
   */
  print() {
    if (!this.data.sale?.uid) {
      return;
    }
    if (this.data.previewReceipt) {
      this.dialog.open(ReceiptDialogComponent, {
        width: '400px',
        maxWidth: '95vw',
        autoFocus: false,
        data: { billUid: this.data.sale.uid },
      });
      return;
    }
    this.dialog.open(ReceiptDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      autoFocus: false,
      hasBackdrop: false,
      panelClass: 'receipt-auto-print',
      data: { billUid: this.data.sale.uid, autoPrint: true },
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
