import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';
import { Response, ResponseList } from '../../Utils/models/responces';
import { AlertService } from '../../Utils/services/alert';
import { Authentication } from '../../Utils/services/authentication';

interface CountRow {
  uid: string;
  serviceName: string;
  serviceCode: string;
  unit: string | null;
  packUnit: string | null;
  unitsPerPack: number;
  stockQuantity: number;
  buyingPrice: number;
  packs: number | null;
  loose: number | null;
}

/**
 * Stock variance: count the store at one go and see what is missing. The
 * count form lists every product counted in the store with what the system
 * holds; type what is on the shelf (crates and loose bottles) and it shows the
 * difference and its worth before saving. Saved counts and the losses by
 * product follow below.
 */
@Component({
  selector: 'app-stock-take',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './stock-take.html',
  styleUrl: './stock-take.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTake implements OnInit {
  @Input() area = 'bar';

  /** Who may count and correct the store (SAVE_STORE). */
  private static readonly COUNTERS = ['ROOT', 'CEO', 'MANAGER'];

  canCount = false;
  counting = false;
  loadingItems = false;
  rows: CountRow[] = [];
  note = '';
  confirming = false;
  saving = false;

  filter = 'MONTH';
  readonly filters = [
    { key: 'DAY', label: 'COMMON.TODAY' },
    { key: 'WEEK', label: 'COMMON.THIS_WEEK' },
    { key: 'MONTH', label: 'COMMON.THIS_MONTH' },
    { key: 'LAST_MONTH', label: 'COMMON.LAST_MONTH' },
  ];
  takes: any[] = [];
  byProduct: any[] = [];
  openUid: string | null = null;
  openLines: any[] = [];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private alert: AlertService,
    private translate: TranslateService,
    private auth: Authentication,
  ) {}

  private get url(): string {
    return `${environment.baseApiUrl}/${this.area}/stockTake`;
  }

  ngOnInit(): void {
    this.canCount = StockTake.COUNTERS.some((r) => this.auth.hasRole(r));
    this.loadHistory(this.filter);
  }

  startCount(): void {
    this.counting = true;
    this.loadingItems = true;
    this.confirming = false;
    this.http.get<ResponseList<any>>(`${this.url}/items`).subscribe({
      next: (res) => {
        this.rows = (res?.data ?? []).map((i: any) => ({
          ...i, unitsPerPack: Number(i.unitsPerPack) || 1, stockQuantity: Number(i.stockQuantity) || 0,
          buyingPrice: Number(i.buyingPrice) || 0, packs: null, loose: null,
        }));
        this.loadingItems = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingItems = false;
        this.cdr.markForCheck();
      },
    });
  }

  cancelCount(): void {
    this.counting = false;
    this.confirming = false;
    this.rows = [];
    this.note = '';
  }

  hasPack(r: { packUnit: string | null; unitsPerPack: number }): boolean {
    return !!r.packUnit && r.unitsPerPack > 1;
  }

  /** "4 Crate + 6 Chupa" from a number of bottles. */
  split(units: number, r: { packUnit: string | null; unitsPerPack: number }): { packs: number; loose: number } {
    const n = Math.abs(units);
    return this.hasPack(r) ? { packs: Math.floor(n / r.unitsPerPack), loose: n % r.unitsPerPack } : { packs: 0, loose: n };
  }

  isCounted(r: CountRow): boolean {
    return (r.packs !== null && (r.packs as any) !== '') || (r.loose !== null && (r.loose as any) !== '');
  }

  countedUnits(r: CountRow): number {
    return (Number(r.packs) || 0) * (this.hasPack(r) ? r.unitsPerPack : 0) + (Number(r.loose) || 0);
  }

  diff(r: CountRow): number {
    return this.countedUnits(r) - r.stockQuantity;
  }

  value(r: CountRow): number {
    return Math.round((this.diff(r) * r.buyingPrice) / (r.unitsPerPack || 1));
  }

  /** Puts the system's figure in, for a product found exactly as recorded. */
  matchSystem(r: CountRow): void {
    const s = this.split(r.stockQuantity, r);
    r.packs = this.hasPack(r) ? s.packs : null;
    r.loose = s.loose;
  }

  get counted(): CountRow[] {
    return this.rows.filter((r) => this.isCounted(r));
  }

  get lossTotal(): number {
    return this.counted.reduce((s, r) => s + Math.min(0, this.value(r)), 0);
  }

  get gainTotal(): number {
    return this.counted.reduce((s, r) => s + Math.max(0, this.value(r)), 0);
  }

  get differentCount(): number {
    return this.counted.filter((r) => this.diff(r) !== 0).length;
  }

  save(): void {
    if (this.saving || this.counted.length === 0) {
      return;
    }
    if (!this.confirming) {
      this.confirming = true;
      return;
    }
    this.confirming = false;
    this.saving = true;
    const lines = this.counted.map((r) => ({ barServiceUID: r.uid, countedUnits: this.countedUnits(r) }));
    this.http.post<Response<any>>(`${this.url}/submit`, { lines, note: this.note }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          const loss = Math.abs(Number(res.data.lossValue) || 0);
          this.alert.show(loss > 0 ? 'warning' : 'success', this.translate.instant(loss > 0 ? 'STOCK_TAKE.SAVED_LOSS' : 'STOCK_TAKE.SAVED_OK', { amount: loss.toLocaleString() }));
          this.cancelCount();
          this.loadHistory(this.filter);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadHistory(filter: string): void {
    this.filter = filter;
    this.openUid = null;
    this.http.get<ResponseList<any>>(`${this.url}/list/${filter}`).subscribe({
      next: (res) => {
        this.takes = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.takes = [];
        this.cdr.markForCheck();
      },
    });
    this.http.get<ResponseList<any>>(`${this.url}/variance/${filter}`).subscribe({
      next: (res) => {
        this.byProduct = (res?.data ?? []).map((p: any) => ({ ...p, unitsPerPack: Number(p.unitsPerPack) || 1 }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.byProduct = [];
        this.cdr.markForCheck();
      },
    });
  }

  get periodLoss(): number {
    return this.takes.reduce((s, t) => s + (Number(t.lossValue) || 0), 0);
  }

  get periodGain(): number {
    return this.takes.reduce((s, t) => s + (Number(t.gainValue) || 0), 0);
  }

  toggle(take: any): void {
    if (this.openUid === take.uid) {
      this.openUid = null;
      return;
    }
    this.openUid = take.uid;
    this.openLines = [];
    this.http.get<ResponseList<any>>(`${this.url}/${take.uid}/lines`).subscribe({
      next: (res) => {
        this.openLines = (res?.data ?? []).map((l: any) => ({ ...l, unitsPerPack: Number(l.unitsPerPack) || 1 }));
        this.cdr.markForCheck();
      },
    });
  }
}
