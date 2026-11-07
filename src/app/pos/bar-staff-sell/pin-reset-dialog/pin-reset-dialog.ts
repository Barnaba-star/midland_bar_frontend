import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../service-bar-method';

/**
 * A staff member who forgot their PIN: their code, a new PIN twice, and a
 * manager's login as approval. The backend checks the PIN rules and clears
 * any wrong-PIN lock.
 */
@Component({
  selector: 'app-staff-pin-reset-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './pin-reset-dialog.html',
  styleUrls: ['../unlock-dialog/unlock-dialog.css', './pin-reset-dialog.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPinResetDialog {
  staffCode = '';
  newPin = '';
  confirmPin = '';
  username = '';
  password = '';
  showPassword = false;
  checking = false;
  done = false;

  constructor(
    private dialogRef: MatDialogRef<StaffPinResetDialog, boolean>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
  ) {}

  digits(v: string): string {
    return (v || '').replace(/\D/g, '');
  }

  get pinMismatch(): boolean {
    return this.confirmPin.length === 4 && this.newPin !== this.confirmPin;
  }

  get ready(): boolean {
    return this.staffCode.length >= 3 && /^\d{4}$/.test(this.newPin) && this.newPin === this.confirmPin
      && !!this.username.trim() && !!this.password && !this.checking;
  }

  submit(): void {
    if (!this.ready) {
      return;
    }
    this.checking = true;
    this.barService.resetStaffPin({
      staffCode: this.staffCode,
      newPin: this.newPin,
      username: this.username.trim(),
      password: this.password,
    }).subscribe({
      next: (res) => {
        this.checking = false;
        if (res?.data === true) {
          this.done = true;
        } else {
          // The backend's message is shown by the interceptor; the manager types again.
          this.password = '';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.checking = false;
        this.password = '';
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.done);
  }
}
