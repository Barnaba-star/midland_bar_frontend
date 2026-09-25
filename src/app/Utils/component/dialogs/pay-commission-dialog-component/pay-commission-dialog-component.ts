import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface PayCommissionData {
  staffName: string;
  period: string;
  amount: number;
  branchesPaid: number;
}

@Component({
  selector: 'app-pay-commission-dialog-component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './pay-commission-dialog-component.html',
  styleUrl: './pay-commission-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayCommissionDialogComponent {

  note = '';

  constructor(
    private dialogRef: MatDialogRef<PayCommissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PayCommissionData
  ) {}

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    this.dialogRef.close({ note: this.note?.trim() || null });
  }
}
