import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface LadderRow {
  name: string;
  /** How many of the row above make one of this (the first row is 1). */
  per: number | null;
}

/** What the dialog hands back for saving. */
export interface StockItemResult {
  serviceName: string;
  category: string;
  unitLadder: { name: string; per: number }[];
  buyingPrice: number;
  description?: string;
}

/**
 * A stock item and its ladder of measures, smallest first:
 *   Nyama
 *   Mshikaki = 3 Nyama
 *   Portion  = 10 Mshikaki
 *   Nusu     = 2 Portion
 *   Kilo     = 2 Nusu
 * Stock is counted in the first and bought in the last.
 */
@Component({
  selector: 'app-stock-item-dialog-component',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './stock-item-dialog-component.html',
  styleUrl: './stock-item-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockItemDialogComponent {
  name = '';
  category = 'FOOD';
  buyingPrice: number | null = null;
  description = '';
  rows: LadderRow[] = [
    { name: '', per: 1 },
    { name: '', per: null },
  ];
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { item?: any },
    private dialogRef: MatDialogRef<StockItemDialogComponent, StockItemResult>,
  ) {
    const item = data?.item;
    if (item) {
      this.name = item.serviceName ?? '';
      this.category = item.category ?? 'FOOD';
      this.buyingPrice = item.buyingPrice ?? null;
      this.description = item.description ?? '';
      this.rows = this.rowsFrom(item);
    }
  }

  private rowsFrom(item: any): LadderRow[] {
    try {
      const ladder = JSON.parse(item.unitLadder ?? '[]') as { name: string; per: number }[];
      if (ladder.length) {
        return ladder.map((l, i) => ({ name: l.name, per: i === 0 ? 1 : l.per }));
      }
    } catch {
      // fall through to the plain fields
    }
    const rows: LadderRow[] = [{ name: item.unit ?? '', per: 1 }];
    if (item.packUnit) {
      rows.push({ name: item.packUnit, per: item.unitsPerPack ?? null });
    }
    return rows;
  }

  addRow(): void {
    this.rows = [...this.rows, { name: '', per: null }];
  }

  removeRow(index: number): void {
    if (index === 0 || this.rows.length <= 1) {
      return;
    }
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  /** How many of the smallest measure one of row i is. */
  base(i: number): number {
    let base = 1;
    for (let k = 1; k <= i; k++) {
      base *= Number(this.rows[k].per) || 0;
    }
    return base;
  }

  get top(): LadderRow {
    return this.rows[this.rows.length - 1];
  }

  /** One of the smallest measure costs this much, from the price of the largest. */
  get costOfSmallest(): number {
    const b = this.base(this.rows.length - 1);
    return b > 0 ? (Number(this.buyingPrice) || 0) / b : 0;
  }

  save(): void {
    this.error = '';
    const names = this.rows.map((r) => r.name.trim());
    if (!this.name.trim()) {
      this.error = 'STOCK_ITEM_FORM.ERR_NAME';
      return;
    }
    if (names.some((n) => !n)) {
      this.error = 'STOCK_ITEM_FORM.ERR_LEVEL_NAME';
      return;
    }
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      this.error = 'STOCK_ITEM_FORM.ERR_DUPLICATE';
      return;
    }
    if (this.rows.some((r, i) => i > 0 && !(Number.isInteger(Number(r.per)) && Number(r.per) >= 2))) {
      this.error = 'STOCK_ITEM_FORM.ERR_PER';
      return;
    }
    if (this.buyingPrice === null || Number(this.buyingPrice) < 0) {
      this.error = 'STOCK_ITEM_FORM.ERR_PRICE';
      return;
    }
    this.dialogRef.close({
      serviceName: this.name.trim(),
      category: this.category,
      unitLadder: this.rows.map((r, i) => ({ name: r.name.trim(), per: i === 0 ? 1 : Number(r.per) })),
      buyingPrice: Number(this.buyingPrice),
      description: this.description.trim() || undefined,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
