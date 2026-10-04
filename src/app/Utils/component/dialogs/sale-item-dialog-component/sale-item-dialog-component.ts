import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SellableItems } from '../../../services/sellable-items';
import { StockPacksPipe } from '../../../pipes/stock-packs.pipe';

/** What the dialog hands back: one service and how many of it. */
export interface SaleItemResult {
  service: any;
  quantity: number;
}

/**
 * Adding to a bill, made for a touch screen: tap the first letter (C), tap
 * the drink (Castle Lite), say how many. Typing a name still works. The
 * seller is whoever is logged in, so there is no staff to choose.
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
  /** The letter tapped in the A-Z grid; its services are listed. */
  letter: string | null = null;
  selected: any = null;
  /** A touch screen: no auto-focus on text boxes, which would pop the on-screen keyboard up. */
  private readonly touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  readonly letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];
  quantity = 1;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { billCode?: string },
    private dialogRef: MatDialogRef<SaleItemDialogComponent, SaleItemResult>,
    private sellable: SellableItems,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // The list already in memory shows at once; a fresh copy (prices, stock)
    // replaces it behind the scenes.
    const known = this.sellable.current();
    if (known) {
      this.services = known;
      this.loading = false;
    }
    this.sellable.refresh().subscribe({
      next: (items) => {
        this.services = items;
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
    if (!this.touch) {
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  /** The A-Z grid key a name falls under: its first letter, or # for a digit or symbol. */
  private keyOf(service: any): string {
    const first = String(service?.serviceName ?? '').trim().charAt(0).toUpperCase();
    return first >= 'A' && first <= 'Z' ? first : '#';
  }

  /** How many services sit under each letter - empty letters are greyed out. */
  get letterCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const s of this.services) {
      const k = this.keyOf(s);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  pickLetter(letter: string): void {
    this.letter = letter;
    this.search = '';
    this.cdr.detectChanges();
  }

  backToLetters(): void {
    this.letter = null;
    this.search = '';
    this.cdr.detectChanges();
  }

  /**
   * Names starting with what was typed come first - "C" brings Castle Lite,
   * Coca Cola... - then any other name or code containing it, so "lager"
   * still finds Kilimanjaro Lager.
   */
  get matches(): any[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      // A tapped letter: every service under it, A to Z.
      if (!this.letter) {
        return [];
      }
      return this.services
        .filter((s) => this.keyOf(s) === this.letter)
        .sort((a, b) => String(a.serviceName).localeCompare(String(b.serviceName)));
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
    if (!this.touch) {
      setTimeout(() => this.quantityInput?.nativeElement.select());
    }
  }

  changeService(): void {
    this.selected = null;
    this.cdr.detectChanges();
    if (!this.touch) {
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
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
