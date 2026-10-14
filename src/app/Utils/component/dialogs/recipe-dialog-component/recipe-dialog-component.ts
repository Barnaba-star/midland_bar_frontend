import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** One other stock item a service takes, as the backend's BarServiceDTO.IngredientDTO. */
export interface ExtraIngredientDTO {
  stockItemUid: string;
  saleUnitName?: string;
  saleUnitCount?: number;
  unitsPerSale?: number;
}

interface RecipeRow {
  stockItemUid: string;
  /** A measure of the item's ladder; empty for an item without one. */
  unit: string;
  count: number | null;
}

export interface RecipeDialogData {
  serviceName: string;
  /** The first stock item (chosen in the service form) and its measure. */
  primaryUid: string;
  primaryLabel: string;
  stockItems: any[];
  /** What is stored now: the service's extraIngredients JSON. */
  current?: string | null;
}

/** The stored JSON ([{"uid","unit","count","units"}]) as rows to show or edit. */
export function parseExtraIngredients(json: string | null | undefined): { uid: string; unit: string | null; count: number | null; units: number }[] {
  if (!json) {
    return [];
  }
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** A stock item's measures, smallest first; [] when it has no ladder. */
export function ladderNames(item: any): string[] {
  try {
    const ladder = JSON.parse(item?.unitLadder ?? '[]') as { name: string }[];
    return ladder.map((l) => l.name);
  } catch {
    return [];
  }
}

/**
 * A service made from more than one stock item: a wali samaki takes a piece
 * of fish (chosen in the service form) and a plate of rice. This lists the
 * others, each with how much one sale takes.
 */
@Component({
  selector: 'app-recipe-dialog-component',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './recipe-dialog-component.html',
  styleUrl: './recipe-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDialogComponent {
  rows: RecipeRow[] = [];
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RecipeDialogData,
    private dialogRef: MatDialogRef<RecipeDialogComponent, ExtraIngredientDTO[]>,
  ) {
    this.rows = parseExtraIngredients(data.current)
      .filter((x) => x.uid !== data.primaryUid)
      .map((x) => ({ stockItemUid: x.uid, unit: x.unit ?? '', count: x.unit ? (x.count ?? 1) : x.units }));
  }

  /** Stock items this row may pick: not the first one, not one another row has. */
  choicesFor(index: number): any[] {
    const taken = new Set(this.rows.filter((_, i) => i !== index).map((r) => r.stockItemUid));
    return this.data.stockItems.filter((s) => s.uid !== this.data.primaryUid && !taken.has(s.uid));
  }

  measuresOf(uid: string): string[] {
    return ladderNames(this.data.stockItems.find((s) => s.uid === uid));
  }

  unitOf(uid: string): string {
    return this.data.stockItems.find((s) => s.uid === uid)?.unit ?? '';
  }

  pick(row: RecipeRow): void {
    const measures = this.measuresOf(row.stockItemUid);
    row.unit = measures.length ? measures[0] : '';
    row.count = row.count || 1;
  }

  add(): void {
    this.rows = [...this.rows, { stockItemUid: '', unit: '', count: 1 }];
  }

  remove(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  save(): void {
    this.error = '';
    const filled = this.rows.filter((r) => r.stockItemUid);
    if (filled.some((r) => !(Number.isInteger(Number(r.count)) && Number(r.count) >= 1))) {
      this.error = 'RECIPE_FORM.ERR_COUNT';
      return;
    }
    this.dialogRef.close(filled.map((r) => r.unit
      ? { stockItemUid: r.stockItemUid, saleUnitName: r.unit, saleUnitCount: Number(r.count) }
      : { stockItemUid: r.stockItemUid, unitsPerSale: Number(r.count) }));
  }

  /** Only the first stock item: nothing else to take. */
  none(): void {
    this.dialogRef.close([]);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
