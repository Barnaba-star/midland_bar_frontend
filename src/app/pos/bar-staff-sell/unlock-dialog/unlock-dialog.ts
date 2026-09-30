import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../service-bar-method';

/** A manager's login, asked for before Staff Sell hands the screen back to POS. Closes with true once it checks out. */
@Component({
  selector: 'app-staff-sell-unlock-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './unlock-dialog.html',
  styleUrl: './unlock-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSellUnlockDialog {
  username = '';
  password = '';
  showPassword = false;
  checking = false;

  constructor(
    private dialogRef: MatDialogRef<StaffSellUnlockDialog, boolean>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
  ) {}

  submit(): void {
    if (!this.username.trim() || !this.password || this.checking) {
      return;
    }
    this.checking = true;
    this.barService.unlockStaffSell({ username: this.username.trim(), password: this.password }).subscribe({
      next: (res) => {
        this.checking = false;
        if (res?.data === true) {
          this.dialogRef.close(true);
          return;
        }
        // The backend's message is shown by the interceptor; clear the password for another try.
        this.password = '';
        this.cdr.markForCheck();
      },
      error: () => {
        this.checking = false;
        this.password = '';
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
