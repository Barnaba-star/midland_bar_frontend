import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConfirmDialogData {
  /** Translation key, or plain text - ngx-translate passes through what it cannot find. */
  message: string;
  /** Defaults to "Confirm deletion" when the caller does not set one. */
  title?: string;
  /** Label for the confirming button, when "Delete" is not the right word. */
  confirmLabel?: string;
  dropdownOptions?: { label: string; value: any }[];
}

@Component({
  selector: 'app-comfirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatFormField, MatSelectModule, MatLabel, FormsModule, TranslatePipe],
  templateUrl: './comfirm-dialog.html',
  styleUrl: './comfirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComfirmDialogComponent {
constructor(
  public dialogRef: MatDialogRef<ComfirmDialogComponent>,
  @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
) {}
selectedOption: any = null;

onConfirm(): void {
    const result = this.data.dropdownOptions ? this.selectedOption : true;
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

}
