import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** The ways a bill can be paid - the same set the backend accepts. */
export const PAYMENT_METHODS = ['cash', 'mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];

interface PaymentRow {
  method: string;
  amount: number | null;
  /** Cash only: what the customer handed over. */
  tendered: number | null;
}

export interface PayBillResult {
  payments: { method: string; amount: number; tendered?: number }[];
}

/**
 * Paying a bill. One row by default - the whole bill, cash - and more rows
 * to split it (10,000 cash + 5,000 M-Pesa). Cash rows take what was handed
 * over and show the change. It closes only once the rows add up exactly.
 */
@Component({
  selector: 'app-pay-bill-dialog-component',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './pay-bill-dialog-component.html',
  styleUrl: './pay-bill-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayBillDialogComponent {
  readonly methods = PAYMENT_METHODS;
  rows: PaymentRow[];
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { code: string; total: number; lines: any[] },
    private dialogRef: MatDialogRef<PayBillDialogComponent, PayBillResult>,
  ) {
    this.rows = [{ method: 'cash', amount: data.total, tendered: null }];
  }

  get paid(): number {
    return this.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  get remaining(): number {
    return this.data.total - this.paid;
  }

  change(row: PaymentRow): number | null {
    if (row.method !== 'cash' || row.tendered === null || row.tendered === undefined || `${row.tendered}` === '') {
      return null;
    }
    return (Number(row.tendered) || 0) - (Number(row.amount) || 0);
  }

  /** A new row starts with whatever is still owed. */
  addRow(): void {
    const used = new Set(this.rows.map((r) => r.method));
    const method = this.methods.find((m) => !used.has(m)) ?? 'cash';
    this.rows = [...this.rows, { method, amount: this.remaining > 0 ? this.remaining : null, tendered: null }];
  }

  removeRow(index: number): void {
    if (this.rows.length <= 1) {
      return;
    }
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  /** Put what is still owed onto this row. */
  fillRemaining(row: PaymentRow): void {
    row.amount = (Number(row.amount) || 0) + this.remaining;
  }

  get canPay(): boolean {
    return this.remaining === 0 && this.rows.every((r) => Number(r.amount) > 0 && (this.change(r) ?? 0) >= 0);
  }

  pay(): void {
    this.error = '';
    if (this.rows.some((r) => !(Number(r.amount) > 0) || !Number.isInteger(Number(r.amount)))) {
      this.error = 'PAY_BILL.ERR_AMOUNT';
      return;
    }
    if (this.remaining !== 0) {
      this.error = 'PAY_BILL.ERR_TOTAL';
      return;
    }
    if (this.rows.some((r) => (this.change(r) ?? 0) < 0)) {
      this.error = 'PAY_BILL.ERR_TENDERED';
      return;
    }
    this.dialogRef.close({
      payments: this.rows.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        tendered: this.change(r) !== null ? Number(r.tendered) : undefined,
      })),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
