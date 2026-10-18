import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { Authentication } from '../../Utils/services/authentication';

type Range = 'DAY' | 'WEEK' | 'MONTH';

/**
 * Sales > Refunds: money back on paid bills. A CEO or manager sees what
 * cashiers asked for and approves or rejects it (a rejection needs a
 * reason); everyone sees the period's refunds - a cashier only their own.
 * Asking happens on the paid bill (Sales history > the bill > undo).
 */
@Component({
  selector: 'app-refunds',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './refunds.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Refunds implements OnInit {
  private barService = inject(ServiceBarMethod);
  private auth = inject(Authentication);
  private cdr = inject(ChangeDetectorRef);

  readonly canApprove = this.auth.hasPermission('REFUND_SALES');
  readonly ranges: Range[] = ['DAY', 'WEEK', 'MONTH'];
  range: Range = 'DAY';
  pending: any[] = [];
  rows: any[] = [];
  busy = false;
  rejectingUid: string | null = null;
  rejectNote = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.canApprove) {
      this.barService.findPendingRefunds().subscribe((res) => {
        this.pending = res?.data ?? [];
        this.cdr.markForCheck();
      });
    }
    this.barService.findRefunds(this.range).subscribe((res) => {
      this.rows = res?.data ?? [];
      this.cdr.markForCheck();
    });
  }

  setRange(r: Range): void {
    this.range = r;
    this.load();
  }

  lines(r: any): { serviceName: string; quantity: number; amount: number }[] {
    try {
      return JSON.parse(r.linesJson ?? '[]');
    } catch {
      return [];
    }
  }

  get approvedTotal(): number {
    return this.rows.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  decide(r: any, approve: boolean): void {
    if (this.busy) return;
    if (!approve && this.rejectingUid !== r.uid) {
      this.rejectingUid = r.uid;
      this.rejectNote = '';
      return;
    }
    if (!approve && this.rejectNote.trim().length < 3) return;
    this.busy = true;
    this.barService.decideRefund(r.uid, approve, this.rejectNote.trim()).subscribe({
      next: () => {
        this.busy = false;
        this.rejectingUid = null;
        this.load();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }
}
