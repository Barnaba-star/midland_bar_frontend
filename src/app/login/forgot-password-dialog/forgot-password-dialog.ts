import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';

/**
 * "Umesahau password?" on the login page. There is no SMS/email code to
 * send, so a senior login approves on the spot: the manager for the branch's
 * people, the CEO for the manager, the main office for anyone. Closes with
 * the username once the new password is set, to fill the login form.
 */
@Component({
  selector: 'app-forgot-password-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './forgot-password-dialog.html',
  styleUrl: './forgot-password-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordDialog {
  static readonly MIN = 6;
  username = '';
  newPassword = '';
  confirmPassword = '';
  approverUsername = '';
  approverPassword = '';
  show = false;
  sending = false;
  done = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<ForgotPasswordDialog, string | undefined>,
    private http: HttpClient,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  get short(): boolean {
    return this.newPassword.length > 0 && this.newPassword.length < ForgotPasswordDialog.MIN;
  }

  get mismatch(): boolean {
    return this.confirmPassword.length > 0 && this.newPassword !== this.confirmPassword;
  }

  get ready(): boolean {
    return !!this.username.trim() && this.newPassword.length >= ForgotPasswordDialog.MIN
      && this.newPassword === this.confirmPassword && !!this.approverUsername.trim()
      && !!this.approverPassword && !this.sending;
  }

  submit(): void {
    if (!this.ready) {
      return;
    }
    this.sending = true;
    this.error = '';
    this.http.post<any>(`${environment.baseApiUrl}/authentication/forgotPassword`, {
      username: this.username.trim(),
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
      approverUsername: this.approverUsername.trim(),
      approverPassword: this.approverPassword,
    }).subscribe({
      next: () => {
        this.sending = false;
        this.done = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.sending = false;
        this.approverPassword = '';
        const body = err?.error ?? {};
        const code = body.code ?? '';
        const key = ({
          NOT_APPROVED: 'FORGOT.ERR_NOT_APPROVED',
          APPROVER_SELF: 'FORGOT.ERR_SELF',
          PASSWORD_SHORT: 'FORGOT.ERR_SHORT',
          PASSWORD_MISMATCH: 'FORGOT.ERR_MISMATCH',
          ACCOUNT_BLOCKED: 'LOGIN.ACCOUNT_BLOCKED',
          TOO_MANY_ATTEMPTS: 'LOGIN.TOO_MANY',
          MISSING: 'FORGOT.ERR_MISSING',
        } as Record<string, string>)[code] ?? 'FORGOT.ERR_FAILED';
        this.error = this.translate.instant(key, { minutes: body.minutes ?? 15 });
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.done ? this.username.trim() : undefined);
  }
}
