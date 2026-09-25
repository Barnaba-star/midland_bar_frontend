import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeleteConfirmationData } from '../../../models/models';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-delete-confirmation-component',
  imports: [MatIconModule, CommonModule, TranslatePipe],
  templateUrl: './delete-confirmation-component.html',
  styleUrl: './delete-confirmation-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteConfirmationComponent {

  constructor(
    private dialogRef: MatDialogRef<DeleteConfirmationComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: DeleteConfirmationData
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
