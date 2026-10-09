import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AlertService } from '../../../Utils/services/alert';
import { ServiceBarMethod } from '../../service-bar-method';
import { SalesOpened, StaffHandover } from '../../BarModel';

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
  imports: [MatIconModule, TranslatePipe, DecimalPipe, DatePipe, FormsModule],
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
  /** The method whose money came in short, while its form is open. */
  shorting: string | null = null;
  handed: number | null = null;
  shortNote = '';
  private changed = false;

  /** False while showing the bills the screen already had - the server's figures are on their way. */
  fromServer = false;
  /** Methods whose bills are listed open. */
  expanded = new Set<string>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      staffCode: string;
      mode?: 'staff' | 'cashier';
      /** The screen's own copy of the staff member's unpaid bills: shown at once, then checked. */
      staffName?: string;
      bills?: SalesOpened[];
    },
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
    if (this.data.bills) {
      this.summary = this.fromScreen(this.data.bills);
    }
    this.load();
  }

  /** A first look from the bills on screen, so nothing waits on the network to open. */
  private fromScreen(bills: SalesOpened[]): StaffHandover {
    const open = bills
      .filter((b) => (b.bill || 0) > 0)
      .map((b) => ({
        uid: b.uid!,
        salesCode: b.salesCode ?? '',
        amount: b.bill || 0,
        method: b.paymentNoteMethod ? b.paymentNoteMethod.toLowerCase() : 'cash',
        payer: b.paymentNotePayer,
        sentAt: b.handoverSentAt,
      }));
    const sent = open.map((b) => b.sentAt).filter((t): t is string => !!t).sort();
    return {
      staff: { uid: '', staffCode: this.data.staffCode, name: this.data.staffName ?? '' },
      since: '',
      sentAt: sent.length ? sent[sent.length - 1] : null,
      open: { byMethod: [], total: open.reduce((n, b) => n + b.amount, 0), bills: open },
      paid: { byMethod: [], total: 0 },
    };
  }

  /** Unpaid bills grouped by how they are to be paid - cash first. */
  get groups(): { method: string; amount: number; bills: StaffHandover['open']['bills'] }[] {
    const by = new Map<string, StaffHandover['open']['bills']>();
    for (const b of this.summary?.open.bills ?? []) {
      if (b.amount > 0) {
        by.set(b.method, [...(by.get(b.method) ?? []), b]);
      }
    }
    return [...by.entries()]
      .sort(([a], [b]) => (a === 'cash' ? -1 : b === 'cash' ? 1 : a.localeCompare(b)))
      .map(([method, bills]) => ({ method, bills, amount: bills.reduce((n, b) => n + b.amount, 0) }));
  }

  toggle(method: string): void {
    const next = new Set(this.expanded);
    if (!next.delete(method)) {
      next.add(method);
    }
    this.expanded = next;
  }

  load(): void {
    this.loading = true;
    this.barService.staffHandover(this.data.staffCode).subscribe({
      next: (res) => {
        if (res?.data) {
          this.summary = res.data;
          this.fromServer = true;
        }
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
    return this.groups.find((g) => g.method === 'cash')?.amount ?? 0;
  }

  /** Unpaid bills noted as paid by phone, all methods together. */
  get openPhoneTotal(): number {
    return this.groups.filter((g) => g.method !== 'cash').reduce((sum, g) => sum + g.amount, 0);
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

  /** Less came in for this method than its bills: open the shortage form. */
  startShort(method: string): void {
    this.confirming = null;
    this.shorting = method;
    this.handed = null;
    this.shortNote = '';
  }

  shortOf(amount: number): number {
    return this.handed === null || (this.handed as any) === '' ? 0 : Math.max(0, amount - Number(this.handed));
  }

  /** Bills paid in full, the difference recorded as the staff member's shortage in this method. */
  receiveShort(row: { method: string; amount: number }): void {
    if (this.shortOf(row.amount) <= 0) {
      return;
    }
    this.receive(row, Math.round(Number(this.handed)), this.shortNote.trim());
  }

  /** Cashier: every bill in this method, paid by it, exactly as listed here. */
  receive(row: { method: string }, handedAmount?: number, note?: string): void {
    // Only on the server's figures - the screen's copy may be behind.
    if (!this.summary || this.receiving || !this.fromServer) {
      return;
    }
    const bills = this.summary.open.bills
      .filter(b => b.method === row.method && b.amount > 0)
      .map(b => ({ uid: b.uid, amount: b.amount }));
    this.receiving = row.method;
    this.confirming = null;
    this.shorting = null;
    this.barService.receiveStaffHandover({
      staffCode: this.data.staffCode, method: row.method, bills,
      ...(handedAmount !== undefined ? { handedAmount, note } : {}),
    }).subscribe({
      next: (res) => {
        this.receiving = null;
        if (res?.data) {
          this.changed = true;
          const short = res.data.shortage || 0;
          this.alert.show('success', short > 0
            ? this.translate.instant('STAFF_HANDOVER.SHORT_OK', {
                amount: (res.data.amount - short).toLocaleString(),
                method: this.translate.instant(this.label(row.method)),
                short: short.toLocaleString(),
              })
            : this.translate.instant('STAFF_HANDOVER.RECEIVED_OK', {
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
