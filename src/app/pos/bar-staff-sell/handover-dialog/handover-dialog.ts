import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AlertService } from '../../../Utils/services/alert';
import { ServiceBarMethod } from '../../service-bar-method';
import { StaffHandover, StaffHandoverMethod } from '../../BarModel';

/** Methods the bill dialogs know a label for; anything else shows as typed. */
const KNOWN_METHODS = ['cash', 'mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];

/**
 * Handover summary: how much of the staff member's unpaid bills is cash
 * to hand over and how much came by phone (from "paid by phone" notes),
 * plus what the cashier has already taken this shift, by method.
 *
 * - staff (Staff Sell): checks it, then sends it to the cashier;
 * - cashier (Sales): "Received" on a method pays all that method's bills.
 * Closes with true when bills were paid, so the Sales list reloads.
 */
@Component({
  selector: 'app-staff-handover-dialog',
  imports: [MatIconModule, TranslatePipe, DecimalPipe, DatePipe],
  templateUrl: './handover-dialog.html',
  styleUrl: './handover-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffHandoverDialog implements OnInit {
  summary: StaffHandover | null = null;
  loading = true;
  sending = false;
  /** The method waiting on "yes" before its bills are paid, and the one being paid. */
  confirming: string | null = null;
  receiving: string | null = null;
  private changed = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { staffCode: string; mode?: 'staff' | 'cashier' },
    private dialogRef: MatDialogRef<StaffHandoverDialog, boolean>,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  get cashier(): boolean {
    return this.data.mode === 'cashier';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.barService.staffHandover(this.data.staffCode).subscribe({
      next: (res) => {
        this.summary = res?.data ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Cash still to hand over, from unpaid bills with no phone note. */
  get openCash(): number {
    return this.summary?.open.byMethod.find(m => m.method === 'cash')?.amount ?? 0;
  }

  /** Unpaid bills noted as paid by phone, per method. */
  get openPhone() {
    return (this.summary?.open.byMethod ?? []).filter(m => m.method !== 'cash' && m.amount > 0);
  }

  get openPhoneTotal(): number {
    return this.openPhone.reduce((sum, m) => sum + m.amount, 0);
  }

  label(method: string): string {
    return KNOWN_METHODS.includes(method) ? 'PAY_BILL.METHOD_' + method : method;
  }

  /** Staff: "I am ready" - the cashier sees these bills marked as sent. */
  send(): void {
    this.sending = true;
    this.barService.sendStaffHandover(this.data.staffCode).subscribe({
      next: (res) => {
        this.sending = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('STAFF_HANDOVER.SENT_OK', { count: res.data }));
          // Sent: done here - back to the bills.
          this.close();
          return;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.sending = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Cashier: every bill in this method, paid by it, exactly as listed here. */
  receive(row: StaffHandoverMethod): void {
    if (!this.summary || this.receiving) {
      return;
    }
    const bills = this.summary.open.bills
      .filter(b => b.method === row.method && b.amount > 0)
      .map(b => ({ uid: b.uid, amount: b.amount }));
    this.receiving = row.method;
    this.confirming = null;
    this.barService.receiveStaffHandover({ staffCode: this.data.staffCode, method: row.method, bills }).subscribe({
      next: (res) => {
        this.receiving = null;
        if (res?.data) {
          this.changed = true;
          this.alert.show('success', this.translate.instant('STAFF_HANDOVER.RECEIVED_OK', {
            amount: res.data.amount.toLocaleString(),
            method: this.translate.instant(this.label(row.method)),
            count: res.data.bills,
          }));
        }
        // Paid or refused (bills changed), show what is there now.
        this.load();
      },
      error: () => {
        this.receiving = null;
        this.load();
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }
}
