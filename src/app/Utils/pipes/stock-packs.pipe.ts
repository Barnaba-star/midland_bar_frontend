import { Pipe, PipeTransform } from '@angular/core';

export interface StockPart {
  count: number;
  /** An i18n key (PRODUCT_FORM.UNIT_CRATE) or a name typed in Setting (Portion) - the translate pipe shows either. */
  label: string;
}

export interface StockPacks {
  /** Whole packs on hand - crates, cartons, kilos. 0 when the product has no pack. */
  packs: number;
  /** Units left over after the whole packs - loose bottles. */
  loose: number;
  /** Everything on hand, in the smallest unit. */
  total: number;
  /** Label of the pack unit, or null. */
  packKey: string | null;
  /** Label of the unit, or null. */
  unitKey: string | null;
  /**
   * The count broken down for display, largest first, zero rungs left out:
   * 1077 Nyama on a Kilo/Nusu/Portion/Mshikaki/Nyama ladder reads
   * 8 Kilo, 1 Nusu, 1 Portion, 9 Mshikaki. Without a ladder it is packs
   * then loose units (5 Crate, 23).
   */
  parts: StockPart[];
}

interface Rung {
  name: string;
  base: number;
}

/**
 * Stock is kept in the smallest unit and shown the way it sits on the
 * shelf: 144 bottles of a 24-crate product read as 6 crates, 143 as
 * 5 crates + 23; a stock item with a ladder of measures reads rung by rung.
 */
@Pipe({ name: 'stockPacks' })
export class StockPacksPipe implements PipeTransform {
  transform(product: {
    stockQuantity?: number | null;
    unit?: string | null;
    packUnit?: string | null;
    unitsPerPack?: number | null;
    unitLadder?: string | null;
  } | null | undefined): StockPacks {
    const total = Math.max(0, product?.stockQuantity ?? 0);
    const perPack = product?.unitsPerPack ?? 1;
    const hasPack = !!product?.packUnit && perPack > 1;
    const packs = hasPack ? Math.floor(total / perPack) : 0;
    const loose = hasPack ? total % perPack : total;
    const packKey = hasPack ? unitKey(product!.packUnit!) : null;
    const unit = product?.unit ? unitKey(product.unit) : null;

    let parts: StockPart[];
    const ladder = parseLadder(product?.unitLadder);
    if (ladder.length > 1) {
      parts = breakDown(total, ladder);
    } else if (hasPack) {
      parts = [];
      if (packs) parts.push({ count: packs, label: packKey! });
      if (loose || !packs) parts.push({ count: loose, label: unit ?? '' });
    } else {
      parts = [{ count: total, label: unit ?? '' }];
    }

    return { packs, loose, total, packKey, unitKey: unit, parts };
  }
}

const KNOWN_UNITS = ['BOTTLE', 'CAN', 'GLASS', 'TOT', 'PLATE', 'PIECE', 'CRATE', 'CARTON', 'BOX', 'KILO', 'WHOLE', 'STICK', 'QUARTER'];

/** The i18n key for one of the built-in units; a name typed in Setting is shown as it is. */
export function unitKey(unit: string): string {
  const upper = unit.toUpperCase();
  return KNOWN_UNITS.includes(upper) ? 'PRODUCT_FORM.UNIT_' + upper : unit;
}

/** unitKey for templates: `packUnit | unitLabel | translate` shows Kreti, or Mkungu as typed. */
@Pipe({ name: 'unitLabel' })
export class UnitLabelPipe implements PipeTransform {
  transform(unit: string | null | undefined): string {
    return unit ? unitKey(unit) : '';
  }
}

function parseLadder(json: string | null | undefined): Rung[] {
  if (!json) {
    return [];
  }
  try {
    const rungs = JSON.parse(json) as { name: string; base: number }[];
    return rungs.filter((r) => r?.name && r.base > 0).map((r) => ({ name: r.name, base: r.base }));
  } catch {
    return [];
  }
}

function breakDown(total: number, ladder: Rung[]): StockPart[] {
  const parts: StockPart[] = [];
  let left = total;
  for (let i = ladder.length - 1; i >= 0; i--) {
    const rung = ladder[i];
    const count = Math.floor(left / rung.base);
    if (count > 0) {
      parts.push({ count, label: rung.name });
      left -= count * rung.base;
    }
  }
  return parts.length ? parts : [{ count: 0, label: ladder[0].name }];
}

export interface Measure {
  /** Label to show (an i18n key or a name typed in Setting). */
  label: string;
  /** How many of the smallest unit one of it is. */
  base: number;
}

/**
 * The measures a product's stock can be entered in, largest first: a
 * ladder's rungs (Kilo, Nusu, Portion, Mshikaki, Nyama), else the pack and
 * the unit (Crate, Bottle), else just the unit.
 */
export function measuresOf(product: {
  unit?: string | null;
  packUnit?: string | null;
  unitsPerPack?: number | null;
  unitLadder?: string | null;
} | null | undefined): Measure[] {
  const ladder = parseLadder(product?.unitLadder);
  if (ladder.length) {
    return [...ladder].reverse().map((r) => ({ label: r.name, base: r.base }));
  }
  const unitLabel = product?.unit ? unitKey(product.unit) : 'PRODUCT_FORM.UNIT_PIECE';
  const perPack = product?.unitsPerPack ?? 1;
  if (product?.packUnit && perPack > 1) {
    return [
      { label: unitKey(product.packUnit), base: perPack },
      { label: unitLabel, base: 1 },
    ];
  }
  return [{ label: unitLabel, base: 1 }];
}
