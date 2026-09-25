import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { StockPacksPipe } from '../../../pipes/stock-packs.pipe';

/** What the dialog hands back: one service and how many of it. */
export interface SaleItemResult {
  service: any;
  quantity: number;
}

/**
 * Adding to a bill: type the first letter or two, pick the drink, say how
 * many. The seller is whoever is logged in, so there is no staff to choose.
 */
@Component({
  selector: 'app-sale-item-dialog-component',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe, StockPacksPipe],
  templateUrl: './sale-item-dialog-component.html',
  styleUrl: './sale-item-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleItemDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('quantityInput') quantityInput?: ElementRef<HTMLInputElement>;

  services: any[] = [];
  loading = true;
  search = '';
  selected: any = null;
  quantity = 1;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { billCode?: string },
    private dialogRef: MatDialogRef<SaleItemDialogComponent, SaleItemResult>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.barService.findBarServiceList().subscribe({
      next: (res) => {
        // Stock items (beef, goat meat) are sold through the services made
        // from them, never on their own.
        this.services = (res.data ?? []).filter((s: any) => s.kind !== 'STOCK_ITEM');
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  /**
   * Names starting with what was typed come first - "C" brings Castle Lite,
   * Coca Cola... - then any other name or code containing it, so "lager"
   * still finds Kilimanjaro Lager.
   */
  get matches(): any[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return [];
    }
    const starts: any[] = [];
    const contains: any[] = [];
    for (const s of this.services) {
      const name = (s.serviceName ?? '').toLowerCase();
      const code = (s.serviceCode ?? '').toLowerCase();
      if (name.startsWith(term) || code.startsWith(term)) {
        starts.push(s);
      } else if (name.includes(term) || code.includes(term)) {
        contains.push(s);
      }
    }
    return [...starts, ...contains].slice(0, 12);
  }

  choose(service: any): void {
    this.selected = service;
    this.quantity = 1;
    this.cdr.detectChanges();
    setTimeout(() => this.quantityInput?.nativeElement.select());
  }

  changeService(): void {
    this.selected = null;
    this.cdr.detectChanges();
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  step(by: number): void {
    this.quantity = Math.max(1, (Number(this.quantity) || 0) + by);
  }

  /** Enter in the search box takes the first match. */
  onSearchEnter(): void {
    const first = this.matches[0];
    if (first) {
      this.choose(first);
    }
  }

  get total(): number {
    return (Number(this.selected?.price) || 0) * (Number(this.quantity) || 0);
  }

  get validQuantity(): boolean {
    const q = Number(this.quantity);
    return Number.isInteger(q) && q >= 1;
  }

  /**
   * How many of a service can still be sold, or null when it is not counted:
   * its own stock, or - for a mshikaki made from beef - the beef on hand
   * divided by what one sale takes.
   */
  available(service: any): number | null {
    if (service?.stockSourceUid) {
      const perSale = service.unitsPerSale || 1;
      return Math.floor((service.sourceStockQuantity ?? 0) / perSale);
    }
    return service?.trackStock ? (service.stockQuantity ?? 0) : null;
  }

  /** Counted and asking for more than is on hand. */
  get overStock(): boolean {
    const left = this.available(this.selected);
    return left !== null && Number(this.quantity) > left;
  }

  confirm(): void {
    if (!this.selected || !this.validQuantity || this.overStock) {
      return;
    }
    this.dialogRef.close({ service: this.selected, quantity: Number(this.quantity) });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
