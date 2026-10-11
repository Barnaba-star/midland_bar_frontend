import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../Utils/enviroments/environment';
import { DeviceRegistration } from '../../../Utils/services/device-registration';
import { BranchChoice, BranchChoiceDialogComponent } from '../../../Utils/component/dialogs/branch-choice-dialog-component/branch-choice-dialog-component';

/** What /authentication/staffLogin answers with on a 200 (as on the login page). */
interface StaffLoginReply {
  token?: string;
  code?: string;
  branches?: BranchChoice[];
}

/**
 * How the dialog closes: the colleague's token; "setCode" when their code
 * still needs its first-time setup, which only the login page does; "send"
 * to send the current person's unsent orders first. Nothing = cancelled.
 */
export type ColleagueResult = { token: string } | { setCode: string } | { send: true };

/**
 * "Mpishe mwenzako": a colleague whose phone is broken sells on this one.
 * They type their own code and PIN - the same staffLogin the login page
 * uses, with this device's ticket - and the screen becomes theirs. The
 * first person's bills stay on the server; they come back the same way.
 */
@Component({
  selector: 'app-staff-sell-colleague-dialog',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './colleague-dialog.html',
  styleUrl: './colleague-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffColleagueDialog {
  private http = inject(HttpClient);
  private device = inject(DeviceRegistration);
  private dialog = inject(MatDialog);

  code = '';
  pin = '';
  /** Which box the keypad types into. */
  field: 'code' | 'pin' = 'code';
  checking = false;
  error = '';

  readonly keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'];
  /** A touch screen: the boxes are read-only so the device keyboard stays away - the keypad types. */
  readonly touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { currentName?: string; unsent?: number },
    private dialogRef: MatDialogRef<StaffColleagueDialog, ColleagueResult>,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  get ready(): boolean {
    return /^\d{3,4}$/.test(this.code.trim()) && /^\d{4}$/.test(this.pin) && !this.checking;
  }

  press(k: string): void {
    if (this.checking) {
      return;
    }
    const value = this.field === 'code' ? this.code : this.pin;
    const max = 4;
    let next = value;
    if (k === 'C') {
      next = '';
    } else if (k === '<') {
      next = value.slice(0, -1);
    } else if (value.length < max) {
      next = value + k;
    }
    this.error = '';
    if (this.field === 'code') {
      this.code = next;
      // Four digits: on to the PIN.
      if (k !== 'C' && k !== '<' && next.length === 4) {
        this.field = 'pin';
      }
    } else {
      this.pin = next;
      if (k !== 'C' && k !== '<' && next.length === 4 && this.ready) {
        this.submit();
      }
    }
    this.cdr.markForCheck();
  }

  /** Typed on a real keyboard: digits only. */
  onTyped(which: 'code' | 'pin', value: string): void {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 4);
    if (which === 'code') {
      this.code = digits;
    } else {
      this.pin = digits;
    }
    this.error = '';
    this.cdr.markForCheck();
  }

  submit(branchUID?: string): void {
    if (!this.ready) {
      return;
    }
    this.checking = true;
    this.error = '';
    this.cdr.markForCheck();
    const staffCode = this.code.trim();
    const body = { deviceToken: this.device.token(), staffCode, pin: this.pin, branchUID: branchUID ?? null };
    this.http.post<StaffLoginReply>(`${environment.baseApiUrl}/authentication/staffLogin`, body).subscribe({
      next: (res) => {
        this.checking = false;
        if (res?.code === 'SET_CODE') {
          // First sign-in with the code the manager gave: the login page walks them through choosing their own.
          this.dialogRef.close({ setCode: staffCode });
          return;
        }
        if (res?.code === 'CHOOSE_BRANCH') {
          this.dialog.open(BranchChoiceDialogComponent, {
            width: '460px',
            maxWidth: '95vw',
            autoFocus: false,
            disableClose: true,
            data: { branches: res.branches ?? [] },
          }).afterClosed().subscribe((chosen?: string) => {
            if (chosen) {
              this.submit(chosen);
            }
            this.cdr.markForCheck();
          });
          this.cdr.markForCheck();
          return;
        }
        if (res?.token) {
          this.dialogRef.close({ token: res.token });
          return;
        }
        this.error = this.translate.instant('LOGIN.STAFF_INVALID');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.checking = false;
        this.error = this.errorMessage(err?.error);
        this.pin = '';
        this.field = 'pin';
        this.cdr.markForCheck();
      },
    });
  }

  /** The login page's words for each refusal. */
  private errorMessage(body: any): string {
    switch (body?.code) {
      case 'STAFF_LOCKED': return this.translate.instant('LOGIN.STAFF_LOCKED', { minutes: body?.minutes ?? 15 });
      case 'NO_PIN_SET': return this.translate.instant('LOGIN.STAFF_NO_PIN');
      case 'SUBSCRIPTION_EXPIRED': return this.translate.instant('LOGIN.EXPIRED_TITLE');
      case 'BRANCH_BLOCKED':
        return `${this.translate.instant('LOGIN.BRANCH_BLOCKED_NO_NAME')} ${this.translate.instant('LOGIN.BRANCH_BLOCKED_CONTACT')}`;
      default: return this.translate.instant('LOGIN.STAFF_INVALID');
    }
  }

  sendFirst(): void {
    this.dialogRef.close({ send: true });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
