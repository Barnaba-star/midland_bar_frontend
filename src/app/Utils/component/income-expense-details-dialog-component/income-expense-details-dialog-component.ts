import { PotNamePipe } from '../../pipes/pot-name.pipe';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-income-expense-details-dialog-component',
  imports: [PotNamePipe, MatIcon, DecimalPipe, DatePipe, CommonModule, MatDialogActions, MatDialogContent, TranslatePipe],
  templateUrl: './income-expense-details-dialog-component.html',
  styleUrl: './income-expense-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeExpenseDetailsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: any,

    private dialogRef:
      MatDialogRef<IncomeExpenseDetailsDialogComponent>
  ) {}


  close(): void {
    this.dialogRef.close();
  }

}
