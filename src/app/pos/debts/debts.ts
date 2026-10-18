import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { DebtCustomer, DebtEntry, DebtReport } from '../BarModel';
import { Authentication } from '../../Utils/services/authentication';
import { PAYMENT_METHODS } from '../../Utils/component/dialogs/pay-bill-dialog-component/pay-bill-dialog-component';

type Panel = 'PAY' | 'HISTORY' | 'EDIT';

/**
 * POS > Madeni: customers who drink on credit (owner, 2026-10-18). The bar
 * carries the debt. A bill goes on credit from the Pay dialog (method Deni);
 * here the customer is registered, given a limit (CEO/manager), pays back in
 * the cashier's open shift - it is in their cash-up - and the CEO may write
 * off what will never come. One panel opens under the customer's row.
 */
@Component({
  selector: 'app-debts',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, NgTemplateOutlet, TranslatePipe],
  templateUrl: './debts.html',
  styleUrl: './debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Debts implements OnInit {
  private barService = inject(ServiceBarMethod);
  private auth = inject(Authentication);
  private cdr = inject(ChangeDetectorRef);

  readonly methods = PAYMENT_METHODS;
  readonly canSetLimit = this.auth.hasPermission('MANAGE_DEBT');
  readonly canWriteOff = this.auth.hasPermission('WRITE_OFF_DEBT');
  readonly canTakePayment = this.auth.hasPermission('SAVE_SALES');

  customers: DebtCustomer[] = [];
  report: DebtReport | null = null;
  loading = false;
  search = '';
  onlyOwing = true;

  /** The customer whose panel is open, and which panel. */
  openUid: string | null = null;
  panel: Panel | null = null;
  busy = false;

  /** Register / edit. */
  adding = false;
  form = { name: '', phone: '', note: '', creditLimit: null as number | null, monthlyOffer: null as number | null };

  /** Taking a payment. */
  pay = { method: 'cash', amount: null as number | null, tendered: null as number | null, note: '' };

  /** History, and writing off from it. */
  entries: DebtEntry[] = [];
  offers: any[] = [];
  writeOff = { amount: null as number | null, reason: '', confirming: false };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.barService.findDebtCustomers().subscribe({
      next: (res) => {
        this.customers = res?.data ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
    this.barService.findDebtReport('MONTH').subscribe({
      next: (res) => {
        this.report = res?.data ?? null;
        this.cdr.markForCheck();
      },
    });
  }

  get owedTotal(): number {
    return this.customers.reduce((s, c) => s + Math.max(0, c.balance), 0);
  }

  get owingCount(): number {
    return this.customers.filter((c) => c.balance > 0).length;
  }

  /** Owing a week or more. */
  get oldCount(): number {
    return this.customers.filter((c) => c.balance > 0 && (c.daysOwed ?? 0) >= 7).length;
  }

  get visible(): DebtCustomer[] {
    const q = this.search.trim().toLowerCase();
    return this.customers.filter((c) =>
      (!this.onlyOwing || c.balance > 0 || (c.monthlyOffer ?? 0) > 0 || !!q) &&
      (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, '') || '~')));
  }

  /** 255712345678 → 0712 345 678 */
  phone(p: string): string {
    const local = p?.startsWith('255') ? '0' + p.slice(3) : p ?? '';
    return local.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
  }

  // ------------------------------------------------------------ register / edit

  startAdd(): void {
    this.close();
    this.adding = true;
    this.form = { name: '', phone: '', note: '', creditLimit: null, monthlyOffer: null };
  }

  startEdit(c: DebtCustomer): void {
    this.open(c, 'EDIT');
    this.form = { name: c.name, phone: this.phone(c.phone), note: c.note ?? '', creditLimit: c.creditLimit || null, monthlyOffer: c.monthlyOffer || null };
  }

  saveCustomer(uid?: string): void {
    if (this.busy) return;
    this.busy = true;
    const body = {
      name: this.form.name,
      phone: this.form.phone,
      note: this.form.note,
      creditLimit: this.canSetLimit ? Number(this.form.creditLimit) || 0 : undefined,
      monthlyOffer: this.canSetLimit ? Number(this.form.monthlyOffer) || 0 : undefined,
    };
    this.barService.saveDebtCustomer(body, uid).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.adding = false;
          this.close();
          this.search = '';
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ------------------------------------------------------------ panels

  open(c: DebtCustomer, panel: Panel): void {
    this.adding = false;
    if (this.openUid === c.uid && this.panel === panel) {
      this.close();
      return;
    }
    this.openUid = c.uid;
    this.panel = panel;
    if (panel === 'PAY') {
      this.pay = { method: 'cash', amount: c.balance, tendered: null, note: '' };
    }
    if (panel === 'HISTORY') {
      this.entries = [];
      this.writeOff = { amount: null, reason: '', confirming: false };
      this.barService.findDebtLedger(c.uid).subscribe({
        next: (res) => {
          this.entries = res?.data?.entries ?? [];
          this.offers = (res?.data as any)?.offers ?? [];
          this.cdr.markForCheck();
        },
      });
    }
    this.cdr.markForCheck();
  }

  close(): void {
    this.openUid = null;
    this.panel = null;
    this.cdr.markForCheck();
  }

  change(): number | null {
    if (this.pay.method !== 'cash' || this.pay.tendered === null || `${this.pay.tendered}` === '') return null;
    return (Number(this.pay.tendered) || 0) - (Number(this.pay.amount) || 0);
  }

  canPay(c: DebtCustomer): boolean {
    const amount = Number(this.pay.amount);
    return Number.isInteger(amount) && amount > 0 && amount <= c.balance && (this.change() ?? 0) >= 0;
  }

  takePayment(c: DebtCustomer): void {
    if (this.busy || !this.canPay(c)) return;
    this.busy = true;
    this.barService.payDebt({
      customerUid: c.uid,
      method: this.pay.method,
      amount: Number(this.pay.amount),
      tendered: this.change() !== null ? Number(this.pay.tendered) : undefined,
      note: this.pay.note || undefined,
    }).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.close();
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }

  confirmWriteOff(c: DebtCustomer): void {
    const amount = Number(this.writeOff.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > c.balance || this.writeOff.reason.trim().length < 3) return;
    if (!this.writeOff.confirming) {
      this.writeOff.confirming = true;
      return;
    }
    if (this.busy) return;
    this.busy = true;
    this.barService.writeOffDebt({ customerUid: c.uid, amount, reason: this.writeOff.reason.trim() }).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.close();
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }
}
