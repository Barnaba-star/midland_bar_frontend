import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-staff-details-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './staff-details-dialog-component.html',
  styleUrl: './staff-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDetailsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public staff: any,
    private dialogRef: MatDialogRef<StaffDetailsDialogComponent>,
  ) { }

  close(): void {
    this.dialogRef.close();
  }
}
