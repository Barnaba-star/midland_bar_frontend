import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { StockAdjustDialogComponent, StockAdjustResult } from '../../Utils/component/dialogs/stock-adjust-dialog-component/stock-adjust-dialog-component';
import { StockHistoryDialogComponent } from '../../Utils/component/dialogs/stock-history-dialog-component/stock-history-dialog-component';
import { AlertService } from '../../Utils/services/alert';
import { FormField } from '../../Utils/models/form-field';
import { unitKey } from '../../Utils/pipes/stock-packs.pipe';
import { Authentication } from '../../Utils/services/authentication';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Title2 } from '../../Utils/component/title2/title2';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { PageableParam } from '../../Utils/models/responces';
import { StockPacksPipe } from '../../Utils/pipes/stock-packs.pipe';
import { ServiceBarMethod } from '../service-bar-method';
import { isStoreKeeperOnly } from '../pos-role.guard';
import { BarServiceEntity, StockReceiptDTO } from '../BarModel';
import { CategoryIconPipe, CategoryLabelPipe } from '../../Utils/pipes/product-category.pipe';

/** Where a product's count stands, for the status badge. */
export type StockState = 'OUT' | 'LOW' | 'OK' | 'NOT_COUNTED';

/**
 * The bar's store: every service registered under Setting > Services, with
 * what is on hand. Nothing is added here by hand - a service appears the
 * moment it is registered, at 0, and its count moves through Add Stock and
 * sales.
 */
@Component({
  selector: 'app-bar-store',
  imports: [CategoryIconPipe, CategoryLabelPipe, EmptyStateComponent, Title2, MatIconModule, DecimalPipe, TranslatePipe, StockPacksPipe, MatTooltipModule],
  templateUrl: './bar-store.html',
  styleUrl: './bar-store.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStore implements OnInit {
  private destroyRef = inject(DestroyRef);
  constructor(
    private visibility: Authentication,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private alert: AlertService,
    private translate: TranslateService,
  ) {}

  /**
   * Adding stock needs SAVE_STORE, which the seed gives CEO, MANAGER and
   * STORE_KEEPER (ROOT passes every check). Hiding the button from the rest
   * only spares them a refusal - the backend is what enforces it.
   */
  get canAddStock(): boolean {
    return ['ROOT', 'CEO', 'MANAGER'].some(role => this.visibility.hasRole(role))
      || this.visibility.hasPermission('SAVE_STORE');
  }

  /** The store keeper counts bottles, not money: buying price and stock value stay hidden from them. */
  get seesMoney(): boolean {
    return !isStoreKeeperOnly(this.visibility);
  }

  ngOnInit(): void {
    this.selectedAction = 'STORE.MANAGE';
    this.loadStock();
    // Group names are this page's own words: rename them when EN | SW flips.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.regroup());
  }

  selectedAction = '';

  titleActions: TitleAction[] = [
    {
      icon: 'setting',
      title: 'STORE.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'ADMIN', 'CEO', 'MANAGER', 'CASHIER', 'STORE_KEEPER'],
    },
    {
      // Carries purchase costs, so it stays with those who see money -
      // not the cashier, as on the POS home.
      icon: 'more',
      title: 'STORE.USED',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'ADMIN', 'CEO', 'MANAGER'],
    },
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.selectedAction = action;
    if (action === 'STORE.MANAGE') {
      this.loadStock();
    }
    if (action === 'STORE.USED') {
      this.loadMovements();
    }
  }

  // ---------------------------------------------------------------
  // USED - what was bought and what was used over a period
  // ---------------------------------------------------------------

  /** yyyy-MM-dd, both ends included. Defaults to this month so far. */
  fromDate = toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  toDate = toIsoDate(new Date());
  movements: any[] = [];
  movementPage = 0;
  movementSize = 10;
  movementTotalPages = 0;
  movementTotalElements = 0;
  movementSearch = '';
  private movementSearchTimer?: ReturnType<typeof setTimeout>;

  loadMovements() {
    const params: PageableParam = {
      page: this.movementPage,
      size: this.movementSize,
      searchParam: this.movementSearch || undefined,
      fromDate: this.fromDate,
      toDate: this.toDate,
    };
    this.barService.findStockMovementPage(params).subscribe({
      next: (res) => {
        this.movements = res.data ?? [];
        this.movementTotalPages = res.totalPages ?? 0;
        this.movementTotalElements = res.totalElements ?? 0;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading stock movements:', err),
    });
  }

  onDateChange(which: 'from' | 'to', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      return;
    }
    if (which === 'from') {
      this.fromDate = value;
    } else {
      this.toDate = value;
    }
    this.movementPage = 0;
    this.loadMovements();
  }

  /** Quick ranges: today, the last 7 days, this month. */
  setRange(range: 'TODAY' | 'WEEK' | 'MONTH') {
    const today = new Date();
    this.toDate = toIsoDate(today);
    if (range === 'TODAY') {
      this.fromDate = this.toDate;
    } else if (range === 'WEEK') {
      this.fromDate = toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    } else {
      this.fromDate = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    this.movementPage = 0;
    this.loadMovements();
  }

  onMovementSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.movementSearchTimer);
    this.movementSearchTimer = setTimeout(() => {
      this.movementSearch = value.trim();
      this.movementPage = 0;
      this.loadMovements();
    }, 300);
  }

  changeMovementPage(page: number) {
    if (page < 0 || page >= this.movementTotalPages) {
      return;
    }
    this.movementPage = page;
    this.loadMovements();
  }

  /** A unit count shown as packs + loose, the way the Store tab shows stock. */
  asPacks(units: number, row: any) {
    return new StockPacksPipe().transform({ stockQuantity: units, unit: row.unit, packUnit: row.packUnit, unitsPerPack: row.unitsPerPack, unitLadder: row.unitLadder });
  }

  get movementTotals() {
    return this.movements.reduce(
      (t, m) => ({
        purchasedCost: t.purchasedCost + (m.purchasedCost ?? 0),
        usedValue: t.usedValue + (m.usedUnits ?? 0) * (m.price ?? 0),
      }),
      { purchasedCost: 0, usedValue: 0 },
    );
  }

  /**
   * Every counted product, loaded once and folded by group: drinks, food,
   * shisha, pool, juice, and the store's own measures (Mchele, Nyama ya
   * kuku - the malighafi a dish is made from). A group opens on a click;
   * a search opens every group that has a match (owner, 2026-11-12).
   */
  allProducts: BarServiceEntity[] = [];
  loaded = false;
  groups: StoreGroup[] = [];
  private openGroups = new Set<string>();

  /** Matched against name, code and description, as on the Services page. */
  searchTerm = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  loadStock() {
    const params: PageableParam = { page: 0, size: 1000, filter: 'COUNTED' };
    this.barService.findBarServicePage(params).subscribe({
      next: (res) => {
        this.allProducts = res.data ?? [];
        this.loaded = true;
        this.regroup();
      },
      error: (err) => {
        console.error('Error loading store:', err);
      },
    });
  }

  private regroup() {
    const words = this.searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = this.allProducts.filter((p) => {
      const hay = [p.serviceName, p.serviceCode, p.description].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const by = new Map<string, BarServiceEntity[]>();
    for (const p of shown) {
      const key = p.kind === 'STOCK_ITEM' ? 'STOCK' : (p.category || 'DRINK');
      by.set(key, [...(by.get(key) ?? []), p]);
    }
    const order = ['DRINK', 'JUICE', 'FOOD', 'SHISHA', 'POOL', 'STOCK'];
    const rank = (k: string) => (order.indexOf(k) < 0 ? 99 : order.indexOf(k));
    this.groups = [...by.entries()]
      .sort((x, y) => rank(x[0]) - rank(y[0]))
      .map(([key, items]) => ({
        key,
        name: this.groupName(key),
        icon: GROUP_ICONS[key] ?? 'local_bar',
        items,
        value: items.reduce((sum, p) => sum + this.stockValue(p), 0),
        out: items.filter((p) => this.stockState(p) === 'OUT').length,
        low: items.filter((p) => this.stockState(p) === 'LOW').length,
      }));
    this.cdr.detectChanges();
  }

  private groupName(key: string): string {
    const en = this.translate.getCurrentLang() === 'en';
    const names: Record<string, [string, string]> = {
      DRINK: ['Vinywaji', 'Drinks'],
      FOOD: ['Chakula', 'Food'],
      SHISHA: ['Shisha', 'Shisha'],
      POOL: ['Pool table', 'Pool table'],
      JUICE: ['Fresh Juice', 'Fresh Juice'],
      STOCK: ['Malighafi', 'Ingredients'],
    };
    const n = names[key] ?? [key, key];
    return en ? n[1] : n[0];
  }

  isOpen(key: string): boolean {
    return !!this.searchTerm || this.openGroups.has(key);
  }

  toggleGroup(key: string) {
    if (this.openGroups.has(key)) {
      this.openGroups.delete(key);
    } else {
      this.openGroups.add(key);
    }
    this.cdr.detectChanges();
  }

  get totalStockValue(): number {
    return this.allProducts.reduce((sum, p) => sum + this.stockValue(p), 0);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTerm = value.trim();
      this.regroup();
    }, 200);
  }

  clearSearch(input: HTMLInputElement) {
    input.value = '';
    clearTimeout(this.searchTimer);
    this.searchTerm = '';
    this.regroup();
  }

  stockState(product: BarServiceEntity): StockState {
    if (!product.trackStock) {
      return 'NOT_COUNTED';
    }
    if ((product.stockQuantity ?? 0) <= 0) {
      return 'OUT';
    }
    return product.lowStock ? 'LOW' : 'OK';
  }

  /** What the units on hand cost to buy: buying price is per pack. */
  stockValue(product: BarServiceEntity): number {
    const perPack = product.unitsPerPack || 1;
    return ((product.stockQuantity ?? 0) * (product.buyingPrice ?? 0)) / perPack;
  }

  onAddStock(product: BarServiceEntity) {
    const hasPack = !!product.packUnit && (product.unitsPerPack ?? 1) > 1;
    const pack = hasPack ? this.translate.instant(unitKey(product.packUnit!)) : '';
    const fields: FormField[] = [];
    if (hasPack) {
      fields.push({
        name: 'packs',
        type: 'number',
        label: this.translate.instant('STOCK_FORM.PACKS', { pack }),
        placeholder: this.translate.instant('STOCK_FORM.PACKS_PH', { pack, units: product.unitsPerPack }),
      });
    }
    fields.push(
      {
        name: 'looseUnits',
        type: 'number',
        label: hasPack ? 'STOCK_FORM.LOOSE' : 'STOCK_FORM.UNITS',
        placeholder: hasPack ? 'STOCK_FORM.LOOSE_PH' : 'STOCK_FORM.UNITS',
      },
      {
        name: 'packPrice',
        type: 'number',
        label: hasPack ? this.translate.instant('STOCK_FORM.PACK_PRICE', { pack }) : 'STOCK_FORM.UNIT_PRICE',
        placeholder: 'STOCK_FORM.PRICE_PH',
        required: true,
      },
      {
        name: 'supplier',
        type: 'text',
        label: 'STOCK_FORM.SUPPLIER',
        placeholder: 'STOCK_FORM.SUPPLIER_PH',
        required: true,
      },
      {
        name: 'note',
        type: 'textarea',
        label: 'STOCK_FORM.NOTE',
        placeholder: 'STOCK_FORM.OPTIONAL',
      },
    );

    const dialogRef = this.dialog.open(DialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      autoFocus: false,
      data: {
        formTitle: this.translate.instant('STOCK_FORM.TITLE', { name: product.serviceName }),
        fields,
        // Last delivery's price as the starting point - usually unchanged.
        formData: { packPrice: product.buyingPrice },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      const dto: StockReceiptDTO = {
        barServiceUID: product.uid!,
        packs: hasPack ? Number(result.packs) || 0 : 0,
        looseUnits: Number(result.looseUnits) || 0,
        packPrice: result.packPrice === '' || result.packPrice == null ? undefined : Number(result.packPrice),
        supplier: result.supplier,
        note: result.note,
      };
      if ((dto.packs ?? 0) <= 0 && (dto.looseUnits ?? 0) <= 0) {
        this.alert.show('error', this.translate.instant('STOCK_FORM.NOTHING_ENTERED'));
        return;
      }
      this.barService.addStock(dto).subscribe({
        next: (res) => {
          if (res?.data) {
            this.alert.show('success', this.translate.instant('STOCK_FORM.SAVED', { name: product.serviceName }));
            this.loadStock();
          }
        },
        error: (err) => console.error('Error adding stock:', err),
      });
    });
  }

  onAdjust(product: BarServiceEntity) {
    const dialogRef = this.dialog.open(StockAdjustDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      autoFocus: false,
      data: product,
    });
    dialogRef.afterClosed().subscribe((result?: StockAdjustResult) => {
      if (!result) {
        return;
      }
      this.barService.adjustStock({ barServiceUID: product.uid!, ...result }).subscribe({
        next: (res) => {
          if (res?.data) {
            this.alert.show('success', this.translate.instant('STOCK_ADJUST.SAVED', { name: product.serviceName }));
            this.loadStock();
          }
        },
        error: (err) => console.error('Error adjusting stock:', err),
      });
    });
  }

  onHistory(product: BarServiceEntity) {
    this.dialog.open(StockHistoryDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: product,
    });
  }
}

interface StoreGroup {
  key: string;
  name: string;
  icon: string;
  items: BarServiceEntity[];
  value: number;
  out: number;
  low: number;
}

const GROUP_ICONS: Record<string, string> = {
  DRINK: 'local_bar',
  FOOD: 'restaurant',
  SHISHA: 'smoking_rooms',
  POOL: 'sports_baseball',
  JUICE: 'blender',
  STOCK: 'inventory_2',
};

/** Local calendar date as yyyy-MM-dd (toISOString would shift it to UTC). */
function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
