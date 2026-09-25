import { Component, ChangeDetectionStrategy, ChangeDetectorRef, Inject, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LoginService } from '../../../../login/LoginService';
import { DataDTO } from '../../../../login/model';
import { AlertService } from '../../../services/alert';
import { Authentication } from '../../../services/authentication';

/**
 * Opened two ways. From the profile menu it is an ordinary dialog anyone can
 * close. Straight after a first login it is the only thing on screen: the
 * account is still on the password that arrived by SMS, and until that is
 * replaced the backend answers everything else with PASSWORD_CHANGE_REQUIRED.
 */
export interface ChangePasswordDialogData {
  forced?: boolean;
  /** What they just typed on the login screen, so they don't retype it. */
  currentPassword?: string;
}

@Component({
  selector: 'app-change-password-dialog-component',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './change-password-dialog-component.html',
  styleUrl: './change-password-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordDialogComponent {

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  showOld = false;
  showNew = false;
  showConfirm = false;

  saving = false;
  errorMessage: string | null = null;

  readonly forced: boolean;

  constructor(
    private dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    private loginService: LoginService,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private auth: Authentication,
    @Optional() @Inject(MAT_DIALOG_DATA) data: ChangePasswordDialogData | null,
  ) {
    this.forced = data?.forced === true;
    // They typed it a second ago to get here; asking again proves nothing.
    this.oldPassword = data?.currentPassword ?? '';
  }

  get canSave(): boolean {
    return (
      !this.saving &&
      this.oldPassword.trim().length > 0 &&
      this.newPassword.trim().length >= 6 &&
      this.confirmPassword.trim().length > 0
    );
  }

  save(): void {

    this.errorMessage = null;

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = this.translate.instant('CHANGE_PASSWORD_DIALOG.MISMATCH');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = this.translate.instant('CHANGE_PASSWORD_DIALOG.TOO_SHORT');
      return;
    }

    const dataDTO: DataDTO = {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    };

    this.saving = true;

    this.loginService.changePassword(dataDTO).subscribe({

      next: (res) => {

        this.saving = false;

        if (!res?.data) {
          this.errorMessage = res?.message || this.translate.instant('CHANGE_PASSWORD_DIALOG.FAILED');
          this.cdr.markForCheck();
          return;
        }

        // The token they are holding still says the password must change, so
        // the backend would keep refusing every other call with it. The
        // response carries a replacement.
        if (res.data.token) {
          this.auth.setToken(res.data.token);
        }

        this.alertService.show('success', this.translate.instant('CHANGE_PASSWORD_DIALOG.UPDATED'));

        this.dialogRef.close(true);
      },

      error: (error) => {

        this.saving = false;

        this.errorMessage =
          error?.error?.message ||
          (typeof error?.error === 'string' ? error.error : null) ||
          this.translate.instant('CHANGE_PASSWORD_DIALOG.FAILED');

        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    // There is nowhere to go back to - the token in hand opens nothing else.
    if (this.forced) {
      return;
    }
    this.dialogRef.close();
  }
}
