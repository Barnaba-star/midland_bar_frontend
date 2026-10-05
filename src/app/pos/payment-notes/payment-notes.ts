import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { PaymentNoteRow } from '../BarModel';

type Range = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

/**
 * Sales > Phone payments: every bill noted "paid by phone" (at Staff Sell or
 * Sales) for a period, so the manager can go through the names against the
 * M-Pesa / Tigo Pesa messages: a total per method, then each name with its
 * reference, bill, amount, whose bill, and whether the cashier took it yet.
 */
@Component({
  selector: 'app-payment-notes',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './payment-notes.html',
  styleUrl: './payment-notes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentNotes implements OnInit {
  private barService = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);

  readonly ranges: Range[] = ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'];
  range: Range = 'TODAY';
  from = iso(new Date());
  to = iso(new Date());
  search = '';
  method = 'ALL';
  rows: PaymentNoteRow[] = [];
  loading = false;

  ngOnInit(): void {
    this.setRange('TODAY');
  }

  setRange(range: Range): void {
    this.range = range;
    const today = new Date();
    if (range === 'TODAY') {
      this.from = this.to = iso(today);
    } else if (range === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      this.from = this.to = iso(y);
    } else if (range === 'WEEK') {
      const start = new Date(today);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
      this.from = iso(start);
      this.to = iso(today);
    } else if (range === 'MONTH') {
      this.from = iso(new Date(today.getFullYear(), today.getMonth(), 1));
      this.to = iso(today);
    }
    this.load();
  }

  customDates(): void {
    this.range = 'CUSTOM';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.barService.findPaymentNotes(this.from, this.to).subscribe({
      next: (res) => {
        this.rows = res?.data ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** The methods present, each with how many and how much. */
  get totals(): { method: string; count: number; amount: number; pending: number }[] {
    const by = new Map<string, { method: string; count: number; amount: number; pending: number }>();
    for (const r of this.rows) {
      const t = by.get(r.method) ?? { method: r.method, count: 0, amount: 0, pending: 0 };
      t.count++;
      t.amount += Number(r.amount) || 0;
      if (r.paymentStatus !== 'PAID') t.pending++;
      by.set(r.method, t);
    }
    return [...by.values()].sort((a, b) => b.amount - a.amount);
  }

  get grandTotal(): number {
    return this.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  get visible(): PaymentNoteRow[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((r) =>
      (this.method === 'ALL' || r.method === this.method) &&
      (!q || [r.payerName, r.reference, r.salesCode, r.owner].some((v) => (v ?? '').toLowerCase().includes(q))));
  }

  pickMethod(method: string): void {
    this.method = this.method === method ? 'ALL' : method;
  }
}

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
