import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Authentication } from '../../../services/authentication';
import { OfflineService } from '../../../offline/offline.service';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { DebtCustomer, LoyaltyCard, LoyaltyRule } from '../../../../pos/BarModel';
import { CustomerPin } from '../../customer-pin/customer-pin';

/** The ways a bill can be paid - the same set the backend accepts. */
export const PAYMENT_METHODS = ['cash', 'mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];

/** Not money in: the part goes on a credit customer's account (Madeni). Online only - the limit is checked there. */
export const CREDIT_METHOD = 'deni';

/** Not money in: the bar gives this part free out of the customer's monthly offer (ofa). Online only. */
export const OFFER_METHOD = 'ofa';

interface PaymentRow {
  method: string;
  amount: number | null;
  /** Cash only: what the customer handed over. */
  tendered: number | null;
  /** Deni only: the customer it goes on. */
  customerUid?: string;
}

export interface PayBillResult {
  payments: { method: string; amount: number; tendered?: number; customerUid?: string }[];
}

/**
 * Paying a bill. One row by default - the whole bill, cash - and more rows
 * to split it (10,000 cash + 5,000 M-Pesa). Cash rows take what was handed
 * over and show the change. It closes only once the rows add up exactly.
 */
@Component({
  selector: 'app-pay-bill-dialog-component',
  imports: [FormsModule, MatIconModule, DecimalPipe, TranslatePipe, CustomerPin],
  templateUrl: './pay-bill-dialog-component.html',
  styleUrl: './pay-bill-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayBillDialogComponent {
  private auth = inject(Authentication);
  private offline = inject(OfflineService);
  private barService = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);

  /** Deni is offered to whoever may see the debts, and only with internet. */
  readonly methods = this.auth.hasPermission('VIEW_DEBT') && this.offline.online()
    ? [...PAYMENT_METHODS, CREDIT_METHOD, OFFER_METHOD]
    : PAYMENT_METHODS;
  readonly credit = CREDIT_METHOD;
  readonly offer = OFFER_METHOD;
  rows: PaymentRow[];
  error = '';

  rule: LoyaltyRule | null = null;
  /** The server's answer: the bill reached the rule's amount and has no customer yet. */
  serverAsks = false;
  /** The customer who typed their PIN on this bill here - ofa is only for them. */
  card: LoyaltyCard | null = null;
  askPin = false;
  noCode = false;
  /** Answered "no code": the form opens on signing up. */
  signUp = false;

  get onBill(): string | null {
    return this.card?.name ?? this.data.loyaltyCustomerName ?? null;
  }

  get onBillUid(): string | null {
    return this.card?.uid ?? this.data.loyaltyCustomerUid ?? null;
  }

  /** Big enough to count for a customer, and no one is on the bill yet. */
  get asksForCode(): boolean {
    return this.serverAsks && !!this.data.billUid && !this.onBill;
  }

  found(card: LoyaltyCard): void {
    this.card = card;
    this.askPin = false;
    for (const r of this.rows) {
      if (r.method === OFFER_METHOD) {
        r.customerUid = card.uid;
      }
    }
    this.cdr.markForCheck();
  }

  /** Credit customers, fetched the first time a row turns to Deni. */
  customers: DebtCustomer[] | null = null;
  customerSearch = '';
  /** Registering a customer on the spot (their limit is set by a CEO/manager). */
  registering = false;
  newCustomer = { name: '', phone: '' };

  constructor(
    /** method: start on this one (a bill noted "paid by phone"); note: that note, shown to check against. */
    @Inject(MAT_DIALOG_DATA) public data: {
      code: string; total: number; lines: any[]; method?: string; note?: string; customerUid?: string;
      /** The bill, so a customer can type their PIN on it; who already did. */
      billUid?: string; loyaltyCustomerUid?: string | null; loyaltyCustomerName?: string | null;
    },
    private dialogRef: MatDialogRef<PayBillDialogComponent, PayBillResult>,
  ) {
    // The server adds the bill up and says whether to ask for the customer's code.
    const askUid = data.billUid;
    if (askUid) {
      this.barService.loyaltyAsk(askUid).subscribe({
        next: (res) => {
          const a = res?.data;
          this.rule = a ? { enabled: a.enabled, minBill: a.minBill, billsNeeded: 0, periodDays: 0, rewardAmount: 0 } : null;
          this.serverAsks = !!a?.ask;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }
    const start = data.method && this.methods.includes(data.method) ? data.method : 'cash';
    this.rows = [{ method: start, amount: data.total, tendered: null }];
    // Noted ofa / deni at Staff Sell: that customer is already chosen.
    if (start === CREDIT_METHOD || start === OFFER_METHOD) {
      this.rows[0].customerUid = data.customerUid;
      this.loadCustomers();
    }
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
    return this.remaining === 0 && this.rows.every((r) => Number(r.amount) > 0 && (this.change(r) ?? 0) >= 0)
      && this.rows.every((r) => r.method !== CREDIT_METHOD || this.creditOk(r))
      && this.rows.every((r) => r.method !== OFFER_METHOD || this.offerOk(r));
  }

  /** A row turned to Deni: bring the customers in. */
  methodChanged(row: PaymentRow): void {
    if (row.method !== CREDIT_METHOD && row.method !== OFFER_METHOD) {
      row.customerUid = undefined;
      return;
    }
    // Ofa: only the customer who typed their PIN on this bill.
    if (row.method === OFFER_METHOD) {
      row.customerUid = this.onBillUid ?? undefined;
    }
    if (this.customers === null) {
      this.loadCustomers();
    }
  }

  private loadCustomers(pick?: (c: DebtCustomer[]) => void): void {
    this.barService.findDebtCustomers().subscribe({
      next: (res) => {
        this.customers = res?.data ?? [];
        pick?.(this.customers);
        this.cdr.markForCheck();
      },
      error: () => {
        this.customers = [];
        this.cdr.markForCheck();
      },
    });
  }

  get matchingCustomers(): DebtCustomer[] {
    const q = this.customerSearch.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return (this.customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || (!!digits && c.phone.includes(digits)));
  }

  customerOf(row: PaymentRow): DebtCustomer | undefined {
    return this.customers?.find((c) => c.uid === row.customerUid);
  }

  /** The customer is chosen and the part fits in what they may still owe. */
  creditOk(row: PaymentRow): boolean {
    const c = this.customerOf(row);
    return !!c && c.creditLimit > 0 && (Number(row.amount) || 0) <= c.available;
  }

  /** The customer is chosen and the part fits in what is left of their offer this month. */
  offerOk(row: PaymentRow): boolean {
    const left = this.offerLeftOf(row);
    return !!row.customerUid && row.customerUid === this.onBillUid && left > 0 && (Number(row.amount) || 0) <= left;
  }

  /** What the customer on the bill has left of their offer (the card when known here, else Madeni's list). */
  offerLeftOf(row: PaymentRow): number {
    if (this.card && this.card.uid === row.customerUid) {
      return this.card.offerLeft;
    }
    return this.customerOf(row)?.offerLeft ?? 0;
  }

  /** Customers with an offer, for an ofa row. */
  get offerCustomers(): DebtCustomer[] {
    return this.matchingCustomers.filter((c) => (c.monthlyOffer ?? 0) > 0);
  }

  registerCustomer(row: PaymentRow): void {
    const body = { name: this.newCustomer.name, phone: this.newCustomer.phone };
    this.barService.saveDebtCustomer(body).subscribe({
      next: (res) => {
        const saved = res?.data;
        if (saved) {
          this.registering = false;
          this.newCustomer = { name: '', phone: '' };
          this.loadCustomers(() => (row.customerUid = saved.uid));
        }
        this.cdr.markForCheck();
      },
    });
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
    if (this.rows.some((r) => r.method === CREDIT_METHOD || r.method === OFFER_METHOD) && !this.offline.online()) {
      this.error = 'PAY_BILL.ERR_CREDIT_OFFLINE';
      return;
    }
    if (this.rows.some((r) => r.method === OFFER_METHOD && !this.offerOk(r))) {
      this.error = 'PAY_BILL.ERR_OFFER';
      return;
    }
    if (this.rows.some((r) => r.method === CREDIT_METHOD && !this.creditOk(r))) {
      this.error = 'PAY_BILL.ERR_CREDIT';
      return;
    }
    this.dialogRef.close({
      payments: this.rows.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        tendered: this.change(r) !== null ? Number(r.tendered) : undefined,
        customerUid: r.method === CREDIT_METHOD || r.method === OFFER_METHOD ? r.customerUid : undefined,
      })),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
