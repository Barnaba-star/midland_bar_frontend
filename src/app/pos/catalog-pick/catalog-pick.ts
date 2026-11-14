import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject, Optional } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BranchCatalogItem, CatalogPickResult, CatalogService } from '../../settings/catalog-setting/catalog-service';

interface Row extends BranchCatalogItem {
  ticked: boolean;
  sell: number | null;
  buy: number | null;
}

/**
 * POS > Setting > Huduma (owner, 2026-11-14): the main office's drinks, ticked
 * for this branch, then this branch's own selling and buying price for each.
 * Ticking one the branch already has only changes its prices.
 */
@Component({
  selector: 'app-catalog-pick',
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './catalog-pick.html',
  styleUrl: './catalog-pick.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPick implements OnInit {
  readonly rows = signal<Row[]>([]);
  readonly loading = signal(true);
  readonly step = signal<1 | 2>(1);
  readonly search = signal('');
  readonly error = signal('');
  readonly saving = signal(false);
  readonly failed = signal<CatalogPickResult[]>([]);
  private saved = 0;

  readonly shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.rows();
    return q ? all.filter((r) => [r.displayName, r.barcode, r.packBarcode, r.qrCode].some((v) => (v || '').toLowerCase().includes(q))) : all;
  });
  readonly ticked = computed(() => this.rows().filter((r) => r.ticked));

  constructor(
    private catalog: CatalogService,
    private ref: MatDialogRef<CatalogPick, number | 'manual'>,
    private translate: TranslateService,
    @Optional() @Inject(MAT_DIALOG_DATA) data: { offerManual?: boolean; preselected?: string[] } | null,
  ) {
    this.offerManual = !!data?.offerManual;
    this.preselected = new Set(data?.preselected || []);
  }

  /** Ticked already on the Huduma page: open straight at their prices. */
  private readonly preselected: Set<string>;

  /** Opened from Ongeza Huduma: a way out to type one not in the catalog (owner, 2026-11-14). */
  readonly offerManual: boolean;

  manual(): void {
    this.ref.close('manual');
  }

  ngOnInit(): void {
    this.catalog.forBranch().subscribe({
      next: (r) => {
        this.rows.set((r.data || []).map((c) => ({ ...c, ticked: this.preselected.has(c.uid), sell: c.price ?? null, buy: c.buyingPrice ?? null })));
        if (this.preselected.size && this.ticked().length) this.step.set(2);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggle(row: Row): void {
    this.rows.set(this.rows().map((r) => (r.uid === row.uid ? { ...r, ticked: !r.ticked } : r)));
    this.error.set('');
  }

  setPrice(row: Row, field: 'sell' | 'buy', value: any): void {
    const n = value === '' || value === null ? null : Number(value);
    this.rows.set(this.rows().map((r) => (r.uid === row.uid ? { ...r, [field]: n } : r)));
  }

  /** Ladha and size, under the name rather than in it, so a long one reads. */
  detail(r: Row): string {
    return [r.flavour, r.size].filter((v) => !!v).join(' · ');
  }

  pack(r: Row): string {
    return r.packUnit ? `${r.unitsPerPack} ${r.unit || ''} / ${r.packUnit}` : (r.unit || '');
  }

  next(): void {
    if (this.ticked().length === 0) {
      this.error.set(this.translate.instant('CATALOG.NONE_SELECTED'));
      return;
    }
    this.error.set('');
    this.step.set(2);
  }

  save(): void {
    const picks = this.ticked();
    if (picks.some((r) => !r.sell || r.sell <= 0 || !r.buy || r.buy <= 0)) {
      this.error.set(this.translate.instant('CATALOG.PRICES_REQUIRED'));
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.catalog.addToBranch(picks.map((r) => ({ catalogUid: r.uid, price: r.sell!, buyingPrice: r.buy! }))).subscribe({
      next: (res) => {
        this.saving.set(false);
        const results = res.data || [];
        const bad = results.filter((x) => !x.ok);
        this.saved += results.length - bad.length;
        if (bad.length === 0) {
          this.ref.close(this.saved);
          return;
        }
        // Keep only the ones that did not go in, ticked, so they can be fixed.
        const badIds = new Set(bad.map((b) => b.catalogUid));
        this.rows.set(this.rows().map((r) => ({ ...r, ticked: badIds.has(r.uid), added: r.added || (r.ticked && !badIds.has(r.uid)) })));
        this.failed.set(bad);
      },
      error: () => this.saving.set(false),
    });
  }

  close(): void {
    this.ref.close(this.saved);
  }
}
