import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';
import { ResponseList } from '../../Utils/models/responces';
import { AlertService } from '../../Utils/services/alert';

interface OtherItem {
  name: string;
  percent: number | null;
}

/**
 * What the branch's "Other" commission pays for. The CEO lists the things -
 * internet, the decoder, guards' pay, the generator - and each one's share;
 * every sale then splits its Other amount into a pot per item, which the
 * Income & Expenses report shows as "Other · Internet" and so on.
 */
@Component({
  selector: 'app-other-split',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './other-split.html',
  styleUrl: './other-split.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtherSplit implements OnInit {
  /** The backend area the endpoints live under - "bar" here, "saloon" in the Saloon. */
  @Input() area = 'bar';

  items: OtherItem[] = [];
  loading = true;
  saving = false;

  /** What a bar usually pays for out of Other - one tap adds a row, or all of them at once. */
  readonly suggestions = [
    'OTHER_SPLIT.S_DECODER', 'OTHER_SPLIT.S_INTERNET', 'OTHER_SPLIT.S_SALARY', 'OTHER_SPLIT.S_CLEANING',
    'OTHER_SPLIT.S_FUEL', 'OTHER_SPLIT.S_GENERATOR', 'OTHER_SPLIT.S_ADVERTS', 'OTHER_SPLIT.S_PROMOTIONS',
    'OTHER_SPLIT.S_ENTERTAINMENT', 'OTHER_SPLIT.S_GUARDS', 'OTHER_SPLIT.S_ICE', 'OTHER_SPLIT.S_CHARCOAL',
    'OTHER_SPLIT.S_LICENCES', 'OTHER_SPLIT.S_VOUCHERS', 'OTHER_SPLIT.S_STAFF_MEALS', 'OTHER_SPLIT.S_TRANSPORT',
  ];

  /** Shown beside each share: what it would get from this much Other. */
  readonly example = 10000;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private alert: AlertService,
    private translate: TranslateService,
  ) {}

  private get url(): string {
    return `${environment.baseApiUrl}/${this.area}`;
  }

  ngOnInit(): void {
    this.http.get<ResponseList<any>>(`${this.url}/otherCommissionItems`).subscribe({
      next: (res) => {
        this.items = (res?.data ?? []).map((i: any) => ({ name: i.name, percent: i.percent }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + (Number(i.percent) || 0), 0);
  }

  /** Nothing listed (Other stays one pot), or every row named with shares making 100. */
  get canSave(): boolean {
    if (this.saving) {
      return false;
    }
    if (this.items.length === 0) {
      return true;
    }
    return this.total === 100 && this.items.every((i) => i.name.trim() && Number(i.percent) >= 1);
  }

  shareOf(item: OtherItem): number {
    return (this.example * (Number(item.percent) || 0)) / 100;
  }

  addRow(name = ''): void {
    this.items = [...this.items, { name, percent: null }];
  }

  /**
   * A picked item is saved as its i18n key (OTHER_SPLIT.S_SALARY), so it reads
   * "Mishahara" in SW and "Salaries" in EN everywhere it shows. Typed items stay as typed.
   */
  addSuggestion(key: string): void {
    const label = this.translate.instant(key).toLowerCase();
    if (this.items.some((i) => i.name === key || i.name.trim().toLowerCase() === label)) {
      return;
    }
    this.addRow(key);
  }

  isPicked(item: OtherItem): boolean {
    return item.name.startsWith('OTHER_SPLIT.');
  }

  /** Every suggestion not on the list yet, as rows waiting for their share. */
  addAllSuggestions(): void {
    this.suggestions.forEach((key) => this.addSuggestion(key));
  }

  removeRow(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }

  save(): void {
    if (!this.canSave) {
      return;
    }
    this.saving = true;
    const body = this.items.map((i) => ({ name: i.name.trim(), percent: Number(i.percent) }));
    this.http.post<ResponseList<any>>(`${this.url}/saveOtherCommissionItems`, body).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.items = res.data.map((i: any) => ({ name: i.name, percent: i.percent }));
          this.alert.show('success', this.translate.instant('OTHER_SPLIT.SAVED'));
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
