import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** What is held today, as the page already counted it. */
export interface PurgeAuditDialogData {
  total: number;
  olderThan30: number;
  olderThan90: number;
  olderThan365: number;
}

/**
 * Asks how far back to clear the audit log. Closes with the chosen age in days
 * when it is confirmed, and with nothing when it is not.
 *
 * Removing is by age only: there is no single entry to pick, and the last 7
 * days are never on offer because the backend refuses them.
 */
@Component({
  selector: 'app-purge-audit-dialog-component',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './purge-audit-dialog-component.html',
  styleUrl: './purge-audit-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurgeAuditDialogComponent {

  readonly dayOptions = [7, 30, 90, 365];

  /** The gentlest of the options is the one that starts selected. */
  days = 365;

  constructor(
    public dialogRef: MatDialogRef<PurgeAuditDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: PurgeAuditDialogData
  ) {}

  select(days: number): void {
    this.days = days;
    // Zoneless change detection does not watch the field on its own.
    this.cdr.markForCheck();
  }

  /**
   * How many entries a choice would remove, or null when it is not known.
   * Only 30, 90 and 365 are counted; guessing at 7 would put a wrong figure in
   * front of someone about to delete, so that chip carries no number at all.
   */
  countFor(days: number): number | null {
    if (days === 30) {
      return this.data?.olderThan30 ?? null;
    }
    if (days === 90) {
      return this.data?.olderThan90 ?? null;
    }
    if (days === 365) {
      return this.data?.olderThan365 ?? null;
    }
    return null;
  }

  confirm(): void {
    this.dialogRef.close(this.days);
  }

  close(): void {
    this.dialogRef.close();
  }
}
