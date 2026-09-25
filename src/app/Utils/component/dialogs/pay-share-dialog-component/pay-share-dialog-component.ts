import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** The one person's month, as the row that opened this dialog already knows it. */
export interface PayShareDialogData {
  name: string;
  /** What the month earned them. */
  amount: number;
  paid: number;
  outstanding: number;
}

/**
 * Asks how much of a share is being handed over. Closes with the amount when
 * it is confirmed, and with nothing when it is not.
 */
@Component({
  selector: 'app-pay-share-dialog-component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './pay-share-dialog-component.html',
  styleUrl: './pay-share-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayShareDialogComponent {

  /** Null while the box is empty, which is why it is not just a number. */
  amount: number | null;

  constructor(
    public dialogRef: MatDialogRef<PayShareDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: PayShareDialogData
  ) {
    // The whole of what is owed is what usually changes hands, so it starts there.
    this.amount = data?.outstanding ?? null;
  }

  /** Zoneless change detection does not watch the model on its own. */
  onAmountChange(): void {
    this.cdr.markForCheck();
  }

  /** Nothing entered, or nothing worth recording. */
  get isEmptyOrZero(): boolean {
    return this.amount == null || !(this.amount > 0);
  }

  /** The backend refuses this too - catching it here saves the round trip. */
  get isTooMuch(): boolean {
    return this.amount != null && this.amount > (this.data?.outstanding ?? 0);
  }

  get isValid(): boolean {
    return !this.isEmptyOrZero && !this.isTooMuch;
  }

  /** What they would still be owed once this payout is written down. */
  get remaining(): number {
    const outstanding = this.data?.outstanding ?? 0;
    if (!this.isValid || this.amount == null) {
      return outstanding;
    }
    return Math.max(0, outstanding - this.amount);
  }

  get isFullyPaid(): boolean {
    return this.isValid && this.remaining === 0;
  }

  confirm(): void {
    if (!this.isValid || this.amount == null) {
      return;
    }
    this.dialogRef.close(this.amount);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
