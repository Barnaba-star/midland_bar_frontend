import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Measure, StockPacksPipe, measuresOf } from '../../../pipes/stock-packs.pipe';

export interface StockAdjustResult {
  mode: 'REMOVE' | 'COUNT';
  /** In the smallest unit. */
  units: number;
  reason?: string;
  note?: string;
}

/**
 * Correcting a store count. Either take some out for a reason, or enter
 * what was counted on the shelf and let the difference be recorded. The
 * amount is typed per measure - 1 Nusu + 2 Mshikaki - and added up here.
 */
@Component({
  selector: 'app-stock-adjust-dialog-component',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe, StockPacksPipe],
  templateUrl: './stock-adjust-dialog-component.html',
  styleUrl: './stock-adjust-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustDialogComponent {
  readonly reasons = ['SPOILED', 'BROKEN', 'SHRINKAGE', 'LOST', 'INTERNAL_USE', 'OTHER'];
  readonly measures: Measure[];
  amounts: (number | null)[];
  mode: 'REMOVE' | 'COUNT' = 'REMOVE';
  reason = '';
  note = '';
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public item: any,
    private dialogRef: MatDialogRef<StockAdjustDialogComponent, StockAdjustResult>,
  ) {
    this.measures = measuresOf(item);
    this.amounts = this.measures.map(() => null);
  }

  get onHand(): number {
    return this.item?.stockQuantity ?? 0;
  }

  /** What was typed, in the smallest unit. */
  get units(): number {
    return this.measures.reduce((sum, m, i) => sum + (Number(this.amounts[i]) || 0) * m.base, 0);
  }

  /** The count after saving. */
  get after(): number {
    return this.mode === 'REMOVE' ? this.onHand - this.units : this.units;
  }

  get change(): number {
    return this.after - this.onHand;
  }

  /** Cost of the change: buying price is per pack (the largest measure). */
  get changeValue(): number {
    const perPack = this.item?.unitsPerPack || 1;
    return (this.change * (this.item?.buyingPrice ?? 0)) / perPack;
  }

  setMode(mode: 'REMOVE' | 'COUNT'): void {
    this.mode = mode;
    this.amounts = this.measures.map(() => null);
    this.error = '';
  }

  save(): void {
    this.error = '';
    if (this.amounts.some((a) => a !== null && (!Number.isInteger(Number(a)) || Number(a) < 0))) {
      this.error = 'STOCK_ADJUST.ERR_WHOLE';
      return;
    }
    if (this.mode === 'REMOVE') {
      if (this.units <= 0) {
        this.error = 'STOCK_ADJUST.ERR_NOTHING';
        return;
      }
      if (this.units > this.onHand) {
        this.error = 'STOCK_ADJUST.ERR_TOO_MUCH';
        return;
      }
      if (!this.reason) {
        this.error = 'STOCK_ADJUST.ERR_REASON';
        return;
      }
      if (this.reason === 'OTHER' && !this.note.trim()) {
        this.error = 'STOCK_ADJUST.ERR_NOTE';
        return;
      }
    } else if (this.change === 0) {
      this.error = 'STOCK_ADJUST.ERR_SAME';
      return;
    }
    this.dialogRef.close({
      mode: this.mode,
      units: this.units,
      reason: this.mode === 'REMOVE' ? this.reason : undefined,
      note: this.note.trim() || undefined,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
