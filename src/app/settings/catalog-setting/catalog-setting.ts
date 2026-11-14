import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Authentication } from '../../Utils/services/authentication';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { CatalogItem, CatalogService } from './catalog-service';

/**
 * Settings > Vinywaji (owner, 2026-11-14): the main office describes each
 * drink once - name, flavour, size, bottles to a crate, barcodes. Branches
 * then tick the ones they sell (POS > Setting > Huduma) and add only their
 * own prices.
 */
@Component({
  selector: 'app-catalog-setting',
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './catalog-setting.html',
  styleUrl: './catalog-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogSetting implements OnInit {
  readonly items = signal<CatalogItem[]>([]);
  readonly loading = signal(false);
  readonly search = signal('');
  readonly form = signal<CatalogItem | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');

  /** ROOT, DIRECTOR and ADMIN keep the list; STAFF only reads it. */
  readonly canEdit: boolean;

  readonly shown = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((c) =>
      [c.name, c.flavour, c.size, c.barcode, c.packBarcode].some((v) => (v || '').toLowerCase().includes(q)));
  });

  constructor(
    private catalog: CatalogService,
    private dialog: MatDialog,
    private translate: TranslateService,
    auth: Authentication,
  ) {
    this.canEdit = ['ROOT', 'DIRECTOR', 'ADMIN'].some((r) => auth.hasRole(r));
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.catalog.items().subscribe({
      next: (r) => { this.items.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  label(c: CatalogItem): string {
    return [c.name, c.flavour, c.size].filter((v) => !!v).join(' ');
  }

  packText(c: CatalogItem): string {
    return c.packUnit ? `${c.unitsPerPack} ${c.unit || ''} / ${c.packUnit}` : (c.unit || '');
  }

  add(): void {
    this.error.set('');
    this.form.set({ name: '', flavour: '', size: '', category: 'DRINK', unit: 'Chupa', packUnit: 'Kreti', unitsPerPack: 24, barcode: '', packBarcode: '' });
  }

  edit(c: CatalogItem): void {
    this.error.set('');
    this.form.set({ ...c });
  }

  cancel(): void {
    this.form.set(null);
  }

  patch(field: keyof CatalogItem, value: any): void {
    const f = this.form();
    if (f) this.form.set({ ...f, [field]: value });
  }

  save(): void {
    const f = this.form();
    if (!f || this.saving()) return;
    if (!f.name?.trim()) {
      this.error.set(this.translate.instant('CATALOG.NAME_REQUIRED'));
      return;
    }
    const body: CatalogItem = {
      ...f,
      packUnit: f.packUnit?.trim() || null,
      unitsPerPack: f.packUnit?.trim() ? Number(f.unitsPerPack) || null : 1,
    };
    this.saving.set(true);
    this.catalog.save(body).subscribe({
      next: (r) => {
        this.saving.set(false);
        if (r.data) {
          this.form.set(null);
          this.load();
        } else {
          this.error.set(r.message || '');
        }
      },
      error: () => this.saving.set(false),
    });
  }

  remove(c: CatalogItem): void {
    this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: {
        title: this.translate.instant('CATALOG.DELETE_TITLE'),
        message: this.translate.instant('CATALOG.DELETE_TEXT'),
        item: { branchName: this.label(c), branchCode: '' },
      },
    }).afterClosed().subscribe((ok) => {
      if (ok && c.uid) this.catalog.remove(c.uid).subscribe(() => this.load());
    });
  }
}
