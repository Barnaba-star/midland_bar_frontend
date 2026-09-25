import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { BarServiceEntity, StockReceiptDTO } from '../BarModel';

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
  imports: [EmptyStateComponent, Title2, MatIconModule, DecimalPipe, TranslatePipe, StockPacksPipe],
  templateUrl: './bar-store.html',
  styleUrl: './bar-store.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStore implements OnInit {
  constructor(
    private visibility: Authentication,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private alert: AlertService,
    private translate: TranslateService,
  ) {}

  /**
   * Adding stock needs SAVE_STORE, which the seed gives CEO and MANAGER
   * (ROOT passes every check). Hiding the button from the rest only spares
   * them a refusal - the backend is what enforces it.
   */
  get canAddStock(): boolean {
    return ['ROOT', 'CEO', 'MANAGER'].some(role => this.visibility.hasRole(role));
  }

  ngOnInit(): void {
    this.selectedAction = 'STORE.MANAGE';
    this.loadStock();
  }

  selectedAction = '';

  titleActions: TitleAction[] = [
    {
      icon: 'setting',
      title: 'STORE.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
    {
      // Carries purchase costs, so it stays with those who see money -
      // not the cashier, as on the POS home.
      icon: 'more',
      title: 'STORE.USED',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER'],
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

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  products: BarServiceEntity[] = [];

  /** Matched against name, code and description, as on the Services page. */
  searchTerm = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  loadStock() {
    const params: PageableParam = {
      page: this.page,
      size: this.size,
      searchParam: this.searchTerm || undefined,
      // Only what has a count of its own: bottles and stock items. A
      // mshikaki or a nusu is counted through the meat it is made from.
      filter: 'COUNTED',
    };

    this.barService.findBarServicePage(params).subscribe({
      next: (res) => {
        this.products = res.data ?? [];
        this.totalElements = res.totalElements ?? 0;
        this.totalPages = res.totalPages ?? 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading store:', err);
      },
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    // Wait for a pause in typing rather than asking the backend per keystroke.
    this.searchTimer = setTimeout(() => {
      this.searchTerm = value.trim();
      this.page = 0;
      this.loadStock();
    }, 300);
  }

  clearSearch(input: HTMLInputElement) {
    input.value = '';
    clearTimeout(this.searchTimer);
    this.searchTerm = '';
    this.page = 0;
    this.loadStock();
  }

  changePage(page: number) {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    this.page = page;
    this.loadStock();
  }

  changePageSize(event: Event) {
    this.size = Number((event.target as HTMLSelectElement).value);
    this.page = 0;
    this.loadStock();
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

  /** Value of the stock on this page, for the header. */
  get pageStockValue(): number {
    return this.products.reduce((sum, p) => sum + this.stockValue(p), 0);
  }
}

/** Local calendar date as yyyy-MM-dd (toISOString would shift it to UTC). */
function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
