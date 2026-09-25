import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { unitKey } from '../../../pipes/stock-packs.pipe';

/** The deliveries recorded for one service, newest first. */
@Component({
  selector: 'app-stock-history-dialog-component',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './stock-history-dialog-component.html',
  styleUrl: './stock-history-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockHistoryDialogComponent implements OnInit {
  receipts: any[] = [];
  loading = true;
  page = 0;
  totalPages = 0;
  readonly packKey: string | null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public product: any,
    private dialogRef: MatDialogRef<StockHistoryDialogComponent>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
  ) {
    this.packKey = product?.packUnit && (product.unitsPerPack ?? 1) > 1 ? unitKey(product.packUnit) : null;
  }

  adjustments: any[] = [];

  ngOnInit(): void {
    this.load();
    this.barService.findStockAdjustments(this.product.uid, { page: 0, size: 20 }).subscribe({
      next: (res) => {
        this.adjustments = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.barService.findStockReceipts(this.product.uid, { page: this.page, size: 10 }).subscribe({
      next: (res) => {
        this.receipts = res.data ?? [];
        this.totalPages = res.totalPages ?? 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    this.page = page;
    this.load();
  }

  close(): void {
    this.dialogRef.close();
  }
}
