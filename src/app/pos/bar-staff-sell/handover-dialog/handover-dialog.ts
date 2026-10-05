import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../service-bar-method';
import { StaffHandover } from '../../BarModel';

/** Methods the bill dialogs know a label for; anything else shows as typed. */
const KNOWN_METHODS = ['cash', 'mpesa', 'tigopesa', 'airtelmoney', 'halopesa', 'bank'];

/**
 * Staff Sell summary: how much of the staff member's unpaid bills is cash
 * to hand over and how much came by phone (from "paid by phone" notes),
 * plus what the cashier has already taken this shift, by method.
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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { staffCode: string },
    private dialogRef: MatDialogRef<StaffHandoverDialog>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
  ) {}

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

  close(): void {
    this.dialogRef.close();
  }
}
