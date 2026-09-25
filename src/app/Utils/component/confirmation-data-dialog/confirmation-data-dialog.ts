import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmationDialogData {
  message: string;
  dropdownOptions?: { label: string; value: any }[];
}

@Component({
  selector: 'app-confirmation-data-dialog',
  standalone: true,
  templateUrl: './confirmation-data-dialog.html',
  styleUrl: './confirmation-data-dialog.css',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationDataDialogComponent {
  selectedOption: any = null;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  onConfirm(): void {
    const result = this.data.dropdownOptions ? this.selectedOption : true;
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
