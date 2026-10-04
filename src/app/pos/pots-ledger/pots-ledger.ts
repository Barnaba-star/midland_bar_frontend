import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';
import { Response } from '../../Utils/models/responces';
import { PotNamePipe } from '../../Utils/pipes/pot-name.pipe';

interface Pot {
  name: string;
  collected: number;
  spent: number;
  balance: number;
  weekCollected: number;
  weekSpent: number;
}

/**
 * Every pot's balance since the branch began. Pots are kept week by week, so a
 * week's Income & Expenses only shows that week; this adds them all up - how
 * much TRA, rent or salaries money is really there today. The Other items are
 * one line that opens to show each item.
 */
@Component({
  selector: 'app-pots-ledger',
  imports: [MatIconModule, DecimalPipe, TranslatePipe, PotNamePipe],
  templateUrl: './pots-ledger.html',
  styleUrl: './pots-ledger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PotsLedger implements OnInit {
  @Input() area = 'bar';

  loading = true;
  pots: Pot[] = [];
  otherItems: Pot[] = [];
  other: Pot | null = null;
  totals = { collected: 0, spent: 0, balance: 0 };
  otherOpen = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<Response<any>>(`${environment.baseApiUrl}/${this.area}/insights/ledger`).subscribe({
      next: (res) => {
        const all: Pot[] = (res?.data?.pots ?? []).map((p: any) => ({
          name: p.name, collected: +p.collected || 0, spent: +p.spent || 0, balance: +p.balance || 0,
          weekCollected: +p.weekCollected || 0, weekSpent: +p.weekSpent || 0,
        }));
        const isOther = (n: string) => n === 'Other' || n.startsWith('Other · ');
        this.otherItems = all.filter((p) => isOther(p.name) && (p.collected || p.spent));
        this.pots = all.filter((p) => !isOther(p.name));
        if (this.otherItems.length) {
          const sum = (k: keyof Pot) => this.otherItems.reduce((s, p) => s + (p[k] as number), 0);
          this.other = { name: 'Other', collected: sum('collected'), spent: sum('spent'), balance: sum('balance'),
            weekCollected: sum('weekCollected'), weekSpent: sum('weekSpent') };
        }
        this.totals = { collected: +res?.data?.collected || 0, spent: +res?.data?.spent || 0, balance: +res?.data?.balance || 0 };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** The buckets with Other folded into one line, largest balance first. */
  get rows(): Pot[] {
    const list = [...this.pots];
    if (this.other) list.push(this.other);
    return list.sort((a, b) => b.balance - a.balance);
  }

  usedPercent(p: Pot): number {
    return p.collected > 0 ? Math.min(100, Math.round((p.spent / p.collected) * 100)) : 0;
  }
}
