import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-delete-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './confirm-delete-dialog-component.html',
  styleUrl: './confirm-delete-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDeleteDialogComponent {

  constructor(
    private dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

 cancel(): void {
    this.dialogRef.close(null);
  }

  confirmDelete(): void {
    this.dialogRef.close(this.data.item);
  }
}
