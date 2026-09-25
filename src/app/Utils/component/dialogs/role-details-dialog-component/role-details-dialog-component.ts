import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-role-details-dialog-component',
  imports: [TranslatePipe],
  templateUrl: './role-details-dialog-component.html',
  styleUrl: './role-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleDetailsDialogComponent {

  constructor(
    private dialogRef: MatDialogRef<RoleDetailsDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: any
  ) {

    console.log('Role Dialog Data:', data);
  }

  close(): void {
    this.dialogRef.close();
  }
}
