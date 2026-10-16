import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export type StaffAction = 'HANDOVER' | 'LOSS' | 'PRINT';

/**
 * Tapping a staff member's name on the Sales page: what to do with their
 * bills - the handover summary, a shortage, or print them all. Closes with
 * the choice; the page opens the matching dialog.
 */
@Component({
  selector: 'app-staff-actions-dialog',
  imports: [MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './staff-actions-dialog.html',
  styleUrl: './staff-actions-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffActionsDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { staffName: string; bills: number; total: number; shiftOpen: boolean; canHandover: boolean },
    private dialogRef: MatDialogRef<StaffActionsDialog, StaffAction>,
  ) {}

  choose(action: StaffAction): void {
    this.dialogRef.close(action);
  }

  close(): void {
    this.dialogRef.close();
  }
}
