import { Component, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { UserService } from '../../../../settings/users-setting/user-service';
import { AlertService } from '../../../services/alert';
import { Authentication } from '../../../services/authentication';

export interface ProfileDialogData {
  fullName: string;
  email: string;
  role: string;
  branchName: string;
  profilePic: string;
}

@Component({
  selector: 'app-profile-dialog-component',
  imports: [MatIconModule, TranslatePipe, FormsModule],
  templateUrl: './profile-dialog-component.html',
  styleUrl: './profile-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDialogComponent {

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploading = false;
  errorMessageKey: string | null = null;

  /**
   * Where the monthly payroll sends this person's share. Theirs to set:
   * an account number entered on somebody's behalf is a dispute waiting to
   * happen, and they are the only one who can be sure of it.
   */
  accountNumber = '';
  bankName = '';
  accountName = '';
  private savedAccountNumber = '';
  private savedBankName = '';
  private savedAccountName = '';
  savingAccount = false;
  accountError: string | null = null;

  /**
   * Suggestions, not a list to pick from. Typing "CR" offers CRDB without
   * refusing a bank that is not here - the regions field taught us what a
   * closed list typed into a component costs when reality has more entries
   * than the list does.
   */
  readonly bankSuggestions = [
    'CRDB Bank', 'NMB Bank', 'NBC Bank', 'Exim Bank', 'Stanbic Bank',
    'Absa Bank', 'Equity Bank', 'Diamond Trust Bank', 'Azania Bank',
    'Tanzania Commercial Bank', 'Access Bank', 'KCB Bank', 'I&M Bank',
    'Bank of Africa', 'Mkombozi Commercial Bank', 'Amana Bank',
    'NCBA Bank', 'Standard Chartered', 'Ecobank', 'GTBank',
  ];

  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly MAX_SIZE_BYTES = 10 * 1024 * 1024;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProfileDialogData,
    private dialogRef: MatDialogRef<ProfileDialogComponent>,
    private userService: UserService,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private auth: Authentication,
  ) {
    this.loadAccountNumber();
  }

  /** Read fresh rather than passed in: the sidenav does not carry it. */
  private loadAccountNumber(): void {
    this.userService.findMyBankDetails().subscribe({
      next: (res) => {
        this.accountNumber = res?.data?.accountNumber || '';
        this.bankName = res?.data?.bankName || '';
        this.accountName = res?.data?.accountName || '';
        this.savedAccountNumber = this.accountNumber;
        this.savedBankName = this.bankName;
        this.savedAccountName = this.accountName;
        this.cdr.markForCheck();
      },
      // Leaving it blank is honest - better than showing nothing and
      // silently overwriting whatever is stored on the next save.
      error: () => { },
    });
  }

  get accountChanged(): boolean {
    return this.accountNumber.trim() !== this.savedAccountNumber.trim()
        || this.bankName.trim() !== this.savedBankName.trim()
        || this.accountName.trim() !== this.savedAccountName.trim();
  }

  /** then: what to do once they are saved - Save at the bottom carries on to the picture. */
  saveBankDetails(then?: () => void): void {

    const uid = this.auth.getUserUID();
    if (!uid || this.savingAccount) {
      return;
    }

    const number = this.accountNumber.trim();
    const bank = this.bankName.trim();
    const holder = this.accountName.trim();

    // Any one alone cannot be paid to. Caught here so it is said next to the
    // empty box rather than arriving as a code from the server.
    const filled = [number, bank, holder].filter(Boolean).length;
    if (filled > 0 && filled < 3) {
      this.accountError = this.translate.instant('PROFILE_DIALOG.ACCOUNT_INCOMPLETE');
      return;
    }

    this.accountError = null;
    this.savingAccount = true;

    this.userService.saveBankDetails(uid, {
      accountNumber: number || null,
      bankName: bank || null,
      accountName: holder || null,
    }).subscribe({

      next: (res) => {
        this.savingAccount = false;
        if (res?.data === 'SAVED') {
          this.savedAccountNumber = number;
          this.savedBankName = bank;
          this.savedAccountName = holder;
          this.alertService.show('success', this.translate.instant('PROFILE_DIALOG.ACCOUNT_SAVED'));
          then?.();
        } else if (res?.data === 'INCOMPLETE') {
          this.accountError = this.translate.instant('PROFILE_DIALOG.ACCOUNT_INCOMPLETE');
        } else {
          this.alertService.show('error', this.translate.instant('PROFILE_DIALOG.ACCOUNT_FAILED'));
        }
        this.cdr.markForCheck();
      },

      error: () => {
        this.savingAccount = false;
        this.alertService.show('error', this.translate.instant('PROFILE_DIALOG.ACCOUNT_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  get avatarUrl(): string | null {
    return this.previewUrl || this.data.profilePic || null;
  }

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessageKey = null;

    if (!ProfileDialogComponent.ALLOWED_TYPES.includes(file.type)) {
      this.errorMessageKey = 'PROFILE_DIALOG.INVALID_TYPE';
      input.value = '';
      return;
    }

    if (file.size > ProfileDialogComponent.MAX_SIZE_BYTES) {
      this.errorMessageKey = 'PROFILE_DIALOG.TOO_LARGE';
      input.value = '';
      return;
    }

    this.selectedFile = file;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = URL.createObjectURL(file);

    this.cdr.markForCheck();
  }

  /**
   * Save at the bottom saves everything changed: the bank details (they used
   * to need the small button beside them - Save here said "updated" while
   * leaving them unsaved), then the picture.
   */
  save(): void {
    if (this.accountChanged) {
      this.saveBankDetails(() => this.savePicture());
      return;
    }
    this.savePicture();
  }

  private savePicture(): void {

    if (!this.selectedFile) {
      this.close();
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploading = true;

    this.userService.saveProfilePic(formData).subscribe({

      next: (res) => {

        this.uploading = false;

        this.alertService.show('success', this.translate.instant('PROFILE_DIALOG.UPDATED'));

        const imageName = res.data?.imageName;

        // The caller fetches the picture itself (with the token) by name.
        this.dialogRef.close({ imageName });
      },

      error: (error) => {

        this.uploading = false;

        console.error('Error uploading profile picture:', error);

        this.errorMessageKey = 'PROFILE_DIALOG.UPLOAD_FAILED';

        this.cdr.markForCheck();
      },
    });
  }

  close(): void {

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.dialogRef.close();
  }
}
