import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-user-profile-dialog-component',
  imports: [MatIconModule, CommonModule, DatePipe, TranslatePipe],
  templateUrl: './user-profile-dialog-component.html',
  styleUrl: './user-profile-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public user: any,
    private dialogRef: MatDialogRef<UserProfileDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
