import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { environment } from '../Utils/enviroments/environment';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

interface MenuItem { name: string; price: number; category?: string | null; description?: string | null; }
interface TableView { tableName: string; tableNumber: number; branchName?: string; menu: MenuItem[]; }

/** DRINK / FOOD / SHISHA / POOL as the customer reads them. */
const CATEGORY: Record<string, string> = { DRINK: 'Vinywaji', FOOD: 'Chakula', SHISHA: 'Shisha', POOL: 'Pool' };

/**
 * The customers' window (owner, 2026-11-09): what a phone opens after
 * scanning a table's QR card - no app, no login. The table token in the link
 * is the key; this shows the bar, the table and the menu with prices.
 * Ordering from here comes later.
 */
@Component({
  selector: 'app-customer-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, BrandWord],
  templateUrl: './customer-table.html',
  styleUrl: './customer-table.css',
})
export class CustomerTable {
  /**
   * A client with no interceptors: no login token is sent, so an old or
   * half-valid staff login on the phone can never turn the scan into a
   * sign-in page; no loader, popups or offline queue either - and it is quicker.
   */
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly view = signal<TableView | null>(null);
  readonly state = signal<'loading' | 'ready' | 'missing' | 'offline'>('loading');
  readonly search = signal('');
  readonly category = signal<string>('ALL');

  readonly categories = computed(() => {
    const seen = new Set((this.view()?.menu ?? []).map((m) => m.category || 'OTHER'));
    return ['DRINK', 'FOOD', 'SHISHA', 'POOL', 'OTHER'].filter((c) => seen.has(c));
  });

  readonly groups = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    const items = (this.view()?.menu ?? []).filter((m) =>
      (cat === 'ALL' || (m.category || 'OTHER') === cat) &&
      (!q || m.name.toLowerCase().includes(q) || (m.description ?? '').toLowerCase().includes(q)));
    return this.categories()
      .map((c) => ({ key: c, label: this.label(c), items: items.filter((m) => (m.category || 'OTHER') === c) }))
      .filter((g) => g.items.length > 0);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.http.get<{ data?: TableView; message?: string }>(`${environment.baseApiUrl}/public/table/${encodeURIComponent(this.token)}`)
      .subscribe({
        next: (res) => {
          if (res?.data) {
            this.view.set(res.data);
            this.state.set('ready');
          } else {
            this.state.set('missing');
          }
        },
        error: () => this.state.set('offline'),
      });
  }

  label(c: string): string {
    return CATEGORY[c] ?? 'Mengineyo';
  }

  onSearch(e: Event): void {
    this.search.set((e.target as HTMLInputElement).value);
  }
}
