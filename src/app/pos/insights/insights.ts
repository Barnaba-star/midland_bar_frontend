import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';
import { Response } from '../../Utils/models/responces';

type SortKey = 'profit' | 'marginPercent' | 'revenue' | 'units';

/**
 * Profit & sales: what each product earns over its buying cost, what sells and
 * what sits on the shelf, and when the bar is busiest. Food has no buying price,
 * so its profit is shown as unknown rather than guessed.
 */
@Component({
  selector: 'app-insights',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './insights.html',
  styleUrl: './insights.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Insights implements OnInit {
  @Input() area = 'bar';

  filter = 'MONTH';
  readonly filters = [
    { key: 'DAY', label: 'COMMON.TODAY' },
    { key: 'WEEK', label: 'COMMON.THIS_WEEK' },
    { key: 'MONTH', label: 'COMMON.THIS_MONTH' },
    { key: 'LAST_MONTH', label: 'COMMON.LAST_MONTH' },
    { key: 'THIS_YEAR', label: 'COMMON.THIS_YEAR' },
  ];

  loading = true;
  data: any = null;
  peak: any = null;
  sort: SortKey = 'profit';

  /** ISO weekday 1..7 -> label key. */
  readonly days = [1, 2, 3, 4, 5, 6, 7];
  readonly hours = Array.from({ length: 24 }, (_, i) => i);

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  private get url(): string {
    return `${environment.baseApiUrl}/${this.area}/insights`;
  }

  ngOnInit(): void {
    this.load(this.filter);
  }

  load(filter: string): void {
    this.filter = filter;
    this.loading = true;
    let pending = 2;
    const done = () => {
      if (--pending === 0) {
        this.loading = false;
      }
      this.cdr.markForCheck();
    };
    this.http.get<Response<any>>(`${this.url}/products/${filter}`).subscribe({
      next: (res) => { this.data = res?.data ?? null; done(); },
      error: () => { this.data = null; done(); },
    });
    this.http.get<Response<any>>(`${this.url}/peak/${filter}`).subscribe({
      next: (res) => { this.peak = res?.data ?? null; done(); },
      error: () => { this.peak = null; done(); },
    });
  }

  get products(): any[] {
    return this.data?.products ?? [];
  }

  /** The margin table, sorted; products with no known cost go last when sorting by profit or margin. */
  get sorted(): any[] {
    const key = this.sort;
    return [...this.products].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av === null && bv === null) return b.revenue - a.revenue;
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    });
  }

  /** Top ten by units sold. */
  get bestSellers(): any[] {
    return [...this.products].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10);
  }

  get maxUnits(): number {
    return Math.max(1, ...this.bestSellers.map((p) => p.units));
  }

  get hasUnknownCost(): boolean {
    return this.products.some((p) => !p.costKnown);
  }

  setSort(key: SortKey): void {
    this.sort = key;
  }

  // ---------- peak hours ----------

  private cellMap(): Map<string, number> {
    const m = new Map<string, number>();
    for (const c of this.peak?.cells ?? []) {
      m.set(`${c.day}-${c.hour}`, Number(c.amount) || 0);
    }
    return m;
  }

  get maxCell(): number {
    return Math.max(1, ...(this.peak?.cells ?? []).map((c: any) => Number(c.amount) || 0));
  }

  /** Only the hours that ever had a sale, padded by one each side, so the grid stays readable. */
  get shownHours(): number[] {
    const used = (this.peak?.cells ?? []).map((c: any) => c.hour as number);
    if (used.length === 0) return [];
    const lo = Math.max(0, Math.min(...used) - 1), hi = Math.min(23, Math.max(...used) + 1);
    return this.hours.filter((h) => h >= lo && h <= hi);
  }

  amountAt(day: number, hour: number): number {
    return this.cellMap().get(`${day}-${hour}`) ?? 0;
  }

  heat(day: number, hour: number): number {
    return this.amountAt(day, hour) / this.maxCell;
  }

  /** The three busiest hours of the period. */
  get topHours(): { hour: number; amount: number }[] {
    const by = this.peak?.byHour ?? {};
    return Object.keys(by).map((h) => ({ hour: Number(h), amount: Number(by[h]) || 0 }))
      .sort((a, b) => b.amount - a.amount).slice(0, 3);
  }

  get topDay(): { day: number; amount: number } | null {
    const by = this.peak?.byDay ?? {};
    const days = Object.keys(by).map((d) => ({ day: Number(d), amount: Number(by[d]) || 0 })).sort((a, b) => b.amount - a.amount);
    return days[0] ?? null;
  }

  hourLabel(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }
}
