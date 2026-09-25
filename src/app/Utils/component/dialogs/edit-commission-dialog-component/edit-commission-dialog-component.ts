import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface CommissionRow {
  name: string;
  code: string;
  percent: number;
}

@Component({
  selector: 'app-edit-commission-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, MatIconModule, MatButtonModule],
  templateUrl: './edit-commission-dialog-component.html',
  styleUrl: './edit-commission-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditCommissionDialogComponent {
  serviceName: string;
  rows: CommissionRow[];

  constructor(
    public dialogRef: MatDialogRef<EditCommissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { commission: any }
  ) {
    const commission = data.commission || {};
    this.serviceName = commission.serviceName;
    this.rows = [
      { name: 'Owner Commission', code: 'ownerPercent', percent: commission.ownerPercent || 0 },
      { name: 'Staff Commission', code: 'staffPercent', percent: commission.staffPercent || 0 },
      { name: 'TRA Commission', code: 'traPercent', percent: commission.traPercent || 0 },
      { name: 'Maintenance', code: 'maintenancePercent', percent: commission.maintenancePercent || 0 },
      { name: 'Emergency', code: 'emergencyPercent', percent: commission.emergencyPercent || 0 },
      { name: 'Loan', code: 'loanPercent', percent: commission.loanPercent || 0 },
      { name: 'Rent', code: 'rentPercent', percent: commission.rentPercent || 0 },
      { name: 'Luku', code: 'lukuPercent', percent: commission.lukuPercent || 0 },
      { name: 'Water', code: 'waterPercent', percent: commission.waterPercent || 0 },
      { name: 'Stock Purchase', code: 'stockPurchasePercent', percent: commission.stockPurchasePercent || 0 },
      { name: 'Other', code: 'otherPercent', percent: commission.otherPercent || 0 },
    ];
  }

  get totalPercent(): number {
    return this.rows.reduce((total, row) => total + (Number(row.percent) || 0), 0);
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSave() {
    const result: any = { totalPercent: this.totalPercent };
    this.rows.forEach((row) => {
      result[row.code] = Number(row.percent) || 0;
    });
    this.dialogRef.close(result);
  }
}
