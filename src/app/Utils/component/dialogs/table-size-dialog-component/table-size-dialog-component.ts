import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-table-size-dialog-component',
  imports: [MatDatepickerModule, MatDialogModule, MatInputModule, FormsModule, DatePipe, CommonModule, TranslatePipe],
  templateUrl: './table-size-dialog-component.html',
  styleUrl: './table-size-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSizeDialogComponent {

  selectedDate: Date | null = null;

  constructor(
    private dialogRef: MatDialogRef<TableSizeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

cutoffDate: Date | null = null;

submit() {
  if (!this.cutoffDate) {
    return;
  }

  this.dialogRef.close({
    schemaName: this.data.schemaName,
    tableName: this.data.tableName,
    cutoffDate: this.cutoffDate
  });
}

close() {
  this.dialogRef.close();
}

}
