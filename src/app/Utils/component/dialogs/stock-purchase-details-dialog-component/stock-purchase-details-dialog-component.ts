import { CommonModule } from '@angular/common';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-stock-purchase-details-dialog-component',
  imports: [MatDialogModule, MatIconModule, CommonModule, TranslatePipe],
  templateUrl: './stock-purchase-details-dialog-component.html',
  styleUrl: './stock-purchase-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockPurchaseDetailsDialogComponent {

  constructor(

    private dialogRef:
      MatDialogRef<StockPurchaseDetailsDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: {
      stock: any;
      details: any[];
    }

  ) {}



  get stock(): any {

    return this.data?.stock ?? {};
  }



  get details(): any[] {

    return this.data?.details ?? [];
  }



  close(): void {

    this.dialogRef.close();

  }



  formatAmount(amount: any): string {

    return `Tshs ${Number(amount || 0).toLocaleString('en-TZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  }



  getDescriptionAmount(item: any): number {

    return Number(
      item?.descriptionAmount ??
      item?.amount ??
      0
    );

  }



  getDescription(item: any): string {

    return (
      item?.descriptions ??
      item?.description ??
      'No description'
    );

  }



  getDescriptionDate(item: any): string {

    return (
      item?.createdAt ??
      item?.createdAt ??
      '-'
    );

  }



  getTotalDescriptions(): number {

    return this.details.reduce(
      (total, item) =>
        total + this.getDescriptionAmount(item),
      0
    );

  }

}
