import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { AlertService } from '../../../services/alert';
import { SalesOpened } from '../../../../pos/BarModel';

/** The ways a customer can pay without handing over cash. */
export const NOTE_METHODS = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];
/** Not money: a Madeni customer's monthly offer, or their credit. */
export const CUSTOMER_NOTE_METHODS = ['ofa', 'deni'];

export interface NoteCustomer {
  uid: string;
  name: string;
  /** What is left of their offer this month (ofa) or of their credit (deni). */
  left: number;
}

/**
 * How the customer pays an unpaid bill, for the cashier at handover. Cash is
 * the default (no note). Phone/bank: method + the name the money came from.
 * Ofa / deni: a Madeni customer, proved by the code they give the waiter.
 * It marks nothing as paid. Closes with the updated bill.
 */
@Component({
  selector: 'app-payment-note-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe, DecimalPipe],
  templateUrl: './payment-note-dialog.html',
  styleUrl: './payment-note-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentNoteDialog {
  readonly methods = ['cash', ...NOTE_METHODS, ...CUSTOMER_NOTE_METHODS];
  method: string;
  payer: string;
  reference: string;
  saving = false;

  /** Ofa / deni customers, per method, fetched the first time it is chosen. */
  customers: Record<string, NoteCustomer[] | null> = { ofa: null, deni: null };
  loadingCustomers = false;
  search = '';
  customerUid: string | null;
  code = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { bill: SalesOpened; total?: number },
    private dialogRef: MatDialogRef<PaymentNoteDialog, SalesOpened>,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    this.method = data.bill.paymentNoteMethod || 'cash';
    this.payer = this.isCustomerMethod ? '' : data.bill.paymentNotePayer || '';
    this.reference = data.bill.paymentNoteRef || '';
    this.customerUid = data.bill.paymentNoteCustomerUid || null;
    if (this.isCustomerMethod) {
      this.loadCustomers();
    }
  }

  get hasNote(): boolean {
    return !!this.data.bill.paymentNoteMethod;
  }

  get isCustomerMethod(): boolean {
    return CUSTOMER_NOTE_METHODS.includes(this.method);
  }

  get isPhoneMethod(): boolean {
    return NOTE_METHODS.includes(this.method);
  }

  choose(m: string): void {
    if (m === this.method) {
      return;
    }
    this.method = m;
    this.customerUid = null;
    this.code = '';
    this.search = '';
    if (this.isCustomerMethod) {
      this.loadCustomers();
    }
  }

  private loadCustomers(): void {
    const m = this.method;
    if (this.customers[m] !== null) {
      return;
    }
    this.loadingCustomers = true;
    this.barService.noteCustomers(m).subscribe({
      next: (res) => {
        this.customers = { ...this.customers, [m]: res?.data ?? [] };
        this.loadingCustomers = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.customers = { ...this.customers, [m]: [] };
        this.loadingCustomers = false;
        this.cdr.markForCheck();
      },
    });
  }

  get shownCustomers(): NoteCustomer[] {
    const q = this.search.trim().toLowerCase();
    return (this.customers[this.method] ?? []).filter((c) => !q || c.name.toLowerCase().includes(q));
  }

  get chosen(): NoteCustomer | undefined {
    return (this.customers[this.method] ?? []).find((c) => c.uid === this.customerUid);
  }

  /** The bill is bigger than what the chosen customer has left. */
  get overLeft(): boolean {
    const c = this.chosen;
    return !!c && this.data.total !== undefined && this.data.total > c.left;
  }

  pick(c: NoteCustomer): void {
    this.customerUid = c.uid;
    this.code = '';
  }

  onCode(value: string): void {
    this.code = (value || '').replace(/\D/g, '').slice(0, 6);
  }

  get ready(): boolean {
    if (this.saving) {
      return false;
    }
    if (this.method === 'cash') {
      return this.hasNote;
    }
    if (this.isCustomerMethod) {
      return !!this.chosen && this.code.length >= 4 && !this.overLeft;
    }
    return this.payer.trim().length > 0;
  }

  save(): void {
    if (!this.ready) {
      return;
    }
    if (this.method === 'cash') {
      this.remove();
      return;
    }
    if (this.isCustomerMethod) {
      this.send({ method: this.method, customerUid: this.customerUid!, customerCode: this.code }, 'PAYMENT_NOTE.SAVED');
      return;
    }
    this.send({ method: this.method, payerName: this.payer.trim(), reference: this.reference.trim() }, 'PAYMENT_NOTE.SAVED');
  }

  remove(): void {
    this.send({ method: '' }, 'PAYMENT_NOTE.REMOVED');
  }

  private send(body: { method: string; payerName?: string; reference?: string; customerUid?: string; customerCode?: string }, okKey: string): void {
    this.saving = true;
    this.barService.savePaymentNote(this.data.bill.uid!, body).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant(okKey, { code: this.data.bill.salesCode }));
          this.dialogRef.close(res.data);
        } else if (this.isCustomerMethod) {
          this.code = '';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        if (this.isCustomerMethod) {
          this.code = '';
        }
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
