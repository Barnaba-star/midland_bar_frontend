import { LoyaltyProgressComponent } from '../../loyalty-progress/loyalty-progress';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';
import { AlertService } from '../../../services/alert';
import { LoyaltyProgress, LoyaltyCard, LoyaltyRule, SalesOpened } from '../../../../pos/BarModel';
import { CustomerPin } from '../../customer-pin/customer-pin';

/** The ways a customer can pay without handing over cash. */
export const NOTE_METHODS = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];
/** Not money: a Madeni customer's monthly offer, or their credit. */
export const CUSTOMER_NOTE_METHODS = ['ofa', 'deni'];

/**
 * How the customer pays an unpaid bill, for the cashier at handover. Cash is
 * the default (no note). Phone/bank: method + the name the money came from.
 * Ofa / deni: the customer types their phone + own PIN. A bill at or over
 * the branch's loyalty amount asks "does the customer have a code?" so it
 * counts towards their reward. Marks nothing paid. Closes with the bill.
 */
@Component({
  selector: 'app-payment-note-dialog',
  imports: [LoyaltyProgressComponent, FormsModule, MatIconModule, TranslatePipe, DecimalPipe, CustomerPin],
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

  rule: LoyaltyRule | null = null;
  /** The server's answer: the bill reached the rule's amount and has no customer yet. */
  serverAsks = false;
  /** The customer's offer that comes off this bill by itself, and what they pay. */
  offerNow = 0;
  toPay = 0;
  /** The customer's month so far: bills paid of the rule's count, and unpaid ones. */
  progress: LoyaltyProgress | null = null;
  /** The customer who typed their PIN on this bill, once known here. */
  card: LoyaltyCard | null = null;
  /** "Does the customer have a code?" - answered yes. */
  askPin = false;
  /** Answered no: not asked again while the dialog is open. */
  noCode = false;
  /** Answered "no code": the form opens on signing up. */
  signUp = false;

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
    // The server adds the bill up and says whether to ask for the customer's code.
    const askUid = data.bill.uid!;
    if (askUid) {
      this.barService.loyaltyAsk(askUid).subscribe({
        next: (res) => {
          const a = res?.data;
          this.rule = a ? { enabled: a.enabled, minBill: a.minBill, billsNeeded: 0, periodDays: 0, rewardAmount: 0 } : null;
          this.serverAsks = !!a?.ask;
          this.offerNow = a?.offerNow ?? 0;
          this.toPay = a?.toPay ?? 0;
          this.progress = a?.loyalty ?? null;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
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

  /** Name of the customer already on this bill (typed their PIN), if any. */
  get onBill(): string | null {
    return this.card?.name ?? this.data.bill.loyaltyCustomerName ?? null;
  }

  /** The bill is big enough to count for a customer, and no one is on it yet. */
  get asksForCode(): boolean {
    return this.serverAsks && !this.onBill && !this.isCustomerMethod;
  }

  choose(m: string): void {
    this.method = m;
  }

  found(card: LoyaltyCard): void {
    this.card = card;
    this.askPin = false;
    this.offerNow = card.offerNow ?? 0;
    this.toPay = card.toPay ?? 0;
    this.progress = card.loyalty ?? null;
    // The bill on the screen behind now knows its customer too.
    this.data.bill.loyaltyCustomerUid = card.uid;
    this.data.bill.loyaltyCustomerName = card.name;
    // The waiter is told there and then when the customer's offer comes off this bill.
    this.alert.show('success', this.offerNow > 0
      ? this.translate.instant('CUSTOMER_PIN.HAS_OFFER', { name: card.name, offer: this.offerNow.toLocaleString(), pay: this.toPay.toLocaleString() })
      : this.translate.instant('CUSTOMER_PIN.ON_BILL', { name: card.name }));
    this.cdr.markForCheck();
  }

  /** What the customer on the bill has left for the chosen method; null when not known here. */
  get left(): number | null {
    if (!this.card) {
      return null;
    }
    return this.method === 'ofa' ? this.card.offerLeft : this.card.creditLeft;
  }

  get overLeft(): boolean {
    const l = this.left;
    return l !== null && (this.data.total ?? 0) > l;
  }

  get ready(): boolean {
    if (this.saving) {
      return false;
    }
    if (this.method === 'cash') {
      return this.hasNote;
    }
    if (this.isCustomerMethod) {
      return !!this.onBill && !this.overLeft;
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
      // The customer already typed their PIN on this bill.
      this.send({ method: this.method }, 'PAYMENT_NOTE.SAVED');
      return;
    }
    this.send({ method: this.method, payerName: this.payer.trim(), reference: this.reference.trim() }, 'PAYMENT_NOTE.SAVED');
  }

  remove(): void {
    this.send({ method: '' }, 'PAYMENT_NOTE.REMOVED');
  }

  private send(body: { method: string; payerName?: string; reference?: string }, okKey: string): void {
    this.saving = true;
    this.barService.savePaymentNote(this.data.bill.uid!, body).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant(okKey, { code: this.data.bill.salesCode }));
          this.dialogRef.close(res.data);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
