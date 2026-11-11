import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../../Utils/enviroments/environment';

interface Sums { earned: number; paid: number; loss: number; bonus: number; owed: number; }
interface MyCommission {
  name: string;
  today: Sums;
  week: Sums;
  month: Sums;
  owedAll: number;
  days: (Sums & { date: string })[];
}

/**
 * A waiter's own commission at Staff Sell (owner, 2026-11-11): what they still
 * have to be paid, then today / this week / this month, then day by day.
 */
@Component({
  selector: 'app-my-commission-dialog',
  imports: [MatDialogModule, MatIconModule, TranslatePipe, DecimalPipe, DatePipe],
  templateUrl: './my-commission-dialog.html',
  styleUrl: './my-commission-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCommissionDialog implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  readonly data = inject<{ staffUid: string; name: string }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<MyCommissionDialog>);

  loading = true;
  failed = false;
  info: MyCommission | null = null;
  period: 'today' | 'week' | 'month' = 'today';

  ngOnInit(): void {
    const q = this.data?.staffUid ? `?staffUid=${encodeURIComponent(this.data.staffUid)}` : '';
    this.http.get<{ data: MyCommission }>(`${environment.baseApiUrl}/bar/staffSell/myCommission${q}`).subscribe({
      next: (res) => {
        this.info = res?.data ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      },
    });
  }

  get sums(): Sums | null {
    return this.info ? this.info[this.period] : null;
  }
}
