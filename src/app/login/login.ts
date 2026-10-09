import { BrandWord } from '../Utils/component/brand-word/brand-word';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IconRegistryService } from '../Utils/services/icon-registry.service';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BranchChoice, BranchChoiceDialogComponent } from '../Utils/component/dialogs/branch-choice-dialog-component/branch-choice-dialog-component';
import { SubscribeDialogComponent } from '../Utils/component/dialogs/subscribe-dialog-component/subscribe-dialog-component';
import { ChangePasswordDialogComponent } from '../Utils/component/dialogs/change-password-dialog-component/change-password-dialog-component';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient } from '@angular/common/http';
import { AlertService } from '../Utils/services/alert';
import { Authentication } from '../Utils/services/authentication';
import { environment } from '../Utils/enviroments/environment';
import { ChangeDetectorRef } from '@angular/core';
import { lockStaffSell, unlockStaffSell } from '../pos/bar-staff-sell/staff-sell-lock';
import { DeviceRegistration } from '../Utils/services/device-registration';
import { landingFor } from './landing-for';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
/** What /authentication/staffLogin and /staffSetup answer with on a 200. */
interface StaffLoginReply {
  token?: string;
  code?: string;
  branches?: BranchChoice[];
  /** SET_CODE: the code the system gave, which they may keep. */
  currentCode?: string;
  /** SET_CODE: free 4-digit codes to choose from. */
  suggestions?: string[];
  branchUID?: string;
}

@Component({
  selector: 'app-login',
  imports: [BrandWord, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, CommonModule, TranslatePipe, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
private api = environment.baseApiUrl
private device = inject(DeviceRegistration);
private baseUrl: string = `${this.api}/authentication/login`;

  loginForm: FormGroup;
  showPassword = false;
  submitting = false;

  constructor(private iconRegistry: IconRegistryService, private route:Router, private cookie:CookieService,
  private http:HttpClient, private alert: AlertService, private auth:Authentication,  private cdr: ChangeDetectorRef, private dialog: MatDialog, private translate: TranslateService) {
    this.loginForm = new FormGroup({
      username: new FormControl('', [Validators.required, Validators.minLength(3)]),
      password: new FormControl('', [Validators.required, Validators.minLength(3)])
    });
  }
 /** Cleared on a successful login - see onSubmit. */
 private idleTimer: any;

 ngOnInit(): void {
    const idleTime = 1 * 60 * 1000;

    this.idleTimer = setTimeout(() => {
      // The landing page is the root route; there is no '/landing'.
      this.route.navigate(['/']);
    }, idleTime);
  }
loginError: string = '';

/**
 * Where each role starts:
 *  - ROOT/STAFF/DIRECTOR manage the system: the Dashboard, to pick where to go.
 *  - SUPERVISOR: straight to the Supervisor screen - receiving staff orders is
 *    their whole job, whatever else they hold.
 *  - CEO/MANAGER/CASHIER: the Dashboard too, which shows them POS and Staff
 *    Sell - any of them opens Staff Sell for the staff, who are not users.
 */
private goToLanding(): void {
  this.route.navigate([landingFor((role) => this.auth.hasRole(role))]);
}

/**
 * The first login on a new account. The dialog cannot be dismissed and the
 * password they just typed is carried into it, so the only thing left to do
 * is pick a new one. It hands back a fresh token, and only then do they go
 * anywhere.
 */
private forcePasswordChange(): void {
  this.dialog.open(ChangePasswordDialogComponent, {
    width: '420px',
    maxWidth: '95vw',
    disableClose: true,
    data: {
      forced: true,
      currentPassword: this.loginForm.value.password,
    },
  }).afterClosed().subscribe(changed => {
    if (!changed) {
      // Only reachable if the dialog is closed some other way. The old token
      // opens nothing, so drop it rather than leave them half-signed-in.
      this.auth.removeToken();
      this.cdr.detectChanges();
      return;
    }
    this.auth.startHeartbeat();
    this.goToLanding();
  });
}

/** A staff code in the username box: 3 digits (older codes) or 4 (new ones). */
private static readonly STAFF_CODE = /^\d{3,4}$/;

/** A staff code in the username box: a staff member signing in with their code and PIN. */
get staffMode(): boolean {
  return Login.STAFF_CODE.test(String(this.loginForm?.value?.username ?? '').trim());
}

/** branchUID: the branch chosen by a user of several - sent on the second try, after CHOOSE_BRANCH. */
onSubmit(branchUID?: string) {
  // A 3- or 4-digit username is a staff code: the PIN goes in the
  // password box, and they go straight to Staff Sell.
  const typed = String(this.loginForm.value.username ?? '').trim();
  if (!branchUID && Login.STAFF_CODE.test(typed) && this.loginForm.valid) {
    this.staffSignIn(typed, String(this.loginForm.value.password ?? '').trim());
    return;
  }
  if (this.loginForm.valid) {

    this.loginError = '';
    this.submitting = true;

    this.http.post<{ token?: string; code?: string; branches?: BranchChoice[] }>(
      this.baseUrl,
      branchUID ? { ...this.loginForm.value, branchUID } : this.loginForm.value,
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        this.loginError = '';
        this.paymentSent = false;
        this.submitting = false;

        // Several branches: they choose where to work, then the login goes again for that branch.
        if (res.code === 'CHOOSE_BRANCH') {
          this.dialog.open(BranchChoiceDialogComponent, {
            width: '460px',
            maxWidth: '95vw',
            autoFocus: false,
            disableClose: true,
            data: { branches: res.branches ?? [] },
          }).afterClosed().subscribe((chosen?: string) => {
            if (chosen) {
              this.onSubmit(chosen);
            }
            this.cdr.detectChanges();
          });
          this.cdr.detectChanges();
          return;
        }

        // They are in, so the "nobody is using this screen" timer has done
        // its job. Left running it would walk them off the forced
        // password-change dialog a minute later.
        clearTimeout(this.idleTimer);

        // Save token
        this.auth.removeToken(); // a fresh sign-in: nothing kept from before (e.g. a counter's login)
        this.auth.setToken(res.token!);

        // Signing in is a manager proving who they are, so a till left
        // locked in Staff Sell (after a session ran out) opens again.
        unlockStaffSell();

        // A brand new account is still on the password that was texted to it.
        // There is nothing to navigate to - the backend answers every other
        // call with PASSWORD_CHANGE_REQUIRED until it is replaced - so the
        // change is the screen, and the heartbeat waits with everything else.
        if (this.auth.mustChangePassword()) {
          this.forcePasswordChange();
          this.cdr.detectChanges();
          return;
        }

        // Start heartbeat
        this.auth.startHeartbeat();

        // Someone of this branch signed in here: this device is the bar's,
        // so staff can now sign in on it with their code.
        this.device.register();

        this.goToLanding();

        this.cdr.detectChanges();
      },

      error: (err) => {
        // A lapsed subscription is answered with a structured body so it can
        // be told apart from a wrong password - it is the one failure the
        // customer can fix from this screen.
        const body = err?.error;
        if (body && body.code === 'SUBSCRIPTION_EXPIRED') {
          // The backend sends the code and the figures; the wording is ours,
          // so it is translated and reads the way the rest of this screen
          // does rather than arriving in English from a service layer.
          this.loginError = this.translate.instant('LOGIN.EXPIRED_TITLE');
          this.expiredBranchName = body.branchName ?? '';
          this.expiredMonthlyAmount = body.monthlyAmount ?? null;
          this.subscriptionExpired = true;
          // A declined payment leaves the branch on FAILED and the date
          // untouched, so without saying so the screen just repeats "expired"
          // and the customer is left thinking paying did nothing.
          this.subscriptionStatus = body.subscriptionStatus ?? null;
          this.paymentFailure = body.paymentFailure ?? null;
          this.paymentSent = false;
        } else if (body && body.code === 'ACTIVATION_CODE_EXPIRED') {
          // The code was right, or would have been - it is simply past use.
          // Saying "wrong password" here sends them hunting for a typo in
          // something that was never going to work again.
          this.loginError = this.translate.instant('LOGIN.CODE_EXPIRED');
          this.subscriptionExpired = false;
        } else if (body && body.code === 'ACCOUNT_BLOCKED') {
          // Somebody decided this, so it should read as a decision rather
          // than as a fault the person might try to work around.
          this.loginError = this.translate.instant('LOGIN.ACCOUNT_BLOCKED');
          this.subscriptionExpired = false;
        } else if (body && body.code === 'BRANCH_NOT_ALLOWED') {
          this.loginError = this.translate.instant('LOGIN.BRANCH_NOT_ALLOWED');
          this.subscriptionExpired = false;
        } else if (body && body.code === 'NO_ROLE_ASSIGNED') {
          // Credentials are fine; nobody has said what they may do yet.
          this.loginError = this.translate.instant('LOGIN.NO_ROLE');
          this.subscriptionExpired = false;
        } else {
          this.loginError = typeof body === 'string' ? body : (body?.message ?? '');
          this.subscriptionExpired = false;
        }

        this.auth.removeToken();

        this.submitting = false;

        this.cdr.detectChanges();

        console.log('Login error:', err);
      }
    });
  }
}

/**
 * A staff member: their 3- or 4-digit code and 4-digit PIN, from any device - their
 * own phone included. A device a manager or cashier has signed in on sends
 * its branch ticket, which narrows the code to that branch; otherwise code +
 * PIN are matched across branches, and if they fit two the person picks one.
 * They land in Staff Sell with their own bills, and the device stays there.
 */
private staffSignIn(staffCode: string, pin: string, branchUID?: string): void {
  this.loginError = '';
  this.submitting = true;
  const body = { deviceToken: this.device.token(), staffCode, pin, branchUID: branchUID ?? null };
  this.http.post<StaffLoginReply>(`${this.api}/authentication/staffLogin`, body).subscribe({
    next: (res) => {
      this.submitting = false;
      if (res.code === 'SET_CODE') {
        // Their first sign-in with the code and PIN the manager was given:
        // they pick their own code and PIN before anything else.
        this.openSetup(staffCode, pin, res);
        this.cdr.detectChanges();
        return;
      }
      if (res.code === 'CHOOSE_BRANCH') {
        this.dialog.open(BranchChoiceDialogComponent, {
          width: '460px',
          maxWidth: '95vw',
          autoFocus: false,
          disableClose: true,
          data: { branches: res.branches ?? [] },
        }).afterClosed().subscribe((chosen?: string) => {
          if (chosen) {
            this.staffSignIn(staffCode, pin, chosen);
          }
          this.cdr.detectChanges();
        });
        this.cdr.detectChanges();
        return;
      }
      this.staffSignedIn(res.token!);
    },
    error: (err) => {
      this.loginError = this.staffErrorMessage(err?.error);
      this.auth.removeToken();
      this.submitting = false;
      this.cdr.detectChanges();
    },
  });
}

/** A staff token in hand (sign-in or first-time setup): into Staff Sell, and the device stays there. */
private staffSignedIn(token: string): void {
  clearTimeout(this.idleTimer);
  this.auth.removeToken(); // a fresh sign-in: nothing kept from before (e.g. a counter's login)
  this.auth.setToken(token);
  // No heartbeat: a staff member is not an account to show as online.
  lockStaffSell();
  this.route.navigate(['/staff-sell']);
  this.cdr.detectChanges();
}

/** A staff sign-in or setup refusal, in the screen's own words. */
private staffErrorMessage(body: any): string {
  switch (body?.code) {
    case 'STAFF_LOCKED': return this.translate.instant('LOGIN.STAFF_LOCKED', { minutes: body?.minutes ?? 15 });
    case 'NO_PIN_SET': return this.translate.instant('LOGIN.STAFF_NO_PIN');
    case 'SUBSCRIPTION_EXPIRED': return this.translate.instant('LOGIN.EXPIRED_TITLE');
    case 'CODE_FORMAT': return this.translate.instant('LOGIN.SETUP_CODE_FORMAT');
    case 'CODE_TAKEN': return this.translate.instant('LOGIN.SETUP_CODE_TAKEN');
    case 'PIN_RULE': return this.translate.instant(this.pinRuleKey(this.setupForm.value.newPin) ?? 'LOGIN.SETUP_PIN_RULE');
    case 'PIN_SAME': return this.translate.instant('LOGIN.SETUP_PIN_SAME');
    case 'ALREADY_SET': return this.translate.instant('LOGIN.SETUP_ALREADY_SET');
    default: return this.translate.instant('LOGIN.STAFF_INVALID');
  }
}

// ---------- First sign-in with a code the system gave: choose their own ----------

/** Set while the "choose your code" step shows in place of the sign-in form. */
setup: { staffCode: string; pin: string; branchUID: string | null; currentCode: string; suggestions: string[] } | null = null;
/** The code picked: one of the suggestions, or '' to keep the current one. */
chosenCode = '';
setupError = '';
setupSubmitting = false;
showSetupPin = false;
readonly setupForm = new FormGroup({
  newPin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4}$/)] }),
  confirmPin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
});

private openSetup(staffCode: string, pin: string, res: StaffLoginReply): void {
  this.loginError = '';
  this.setupError = '';
  this.chosenCode = '';
  this.setupForm.reset();
  this.setup = {
    staffCode,
    pin,
    branchUID: res.branchUID ?? null,
    currentCode: res.currentCode ?? staffCode,
    suggestions: (res.suggestions ?? []).filter((c) => !!c),
  };
}

chooseCode(code: string): void {
  this.chosenCode = code;
  this.setupError = '';
}

/** The same rules the server holds a PIN to; null when it is fine. */
pinRuleKey(raw: string | null | undefined): string | null {
  const pin = String(raw ?? '');
  if (!/^\d{4}$/.test(pin)) return 'LOGIN.SETUP_PIN_FORMAT';
  if (new Set(pin).size === 1) return 'LOGIN.SETUP_PIN_REPEAT';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'LOGIN.SETUP_PIN_RUN';
  return null;
}

/** Shown under the PIN boxes once both have something in them. */
get setupPinProblem(): string | null {
  const { newPin, confirmPin } = this.setupForm.getRawValue();
  if (!newPin) return null;
  if (newPin.length === 4) {
    const rule = this.pinRuleKey(newPin);
    if (rule) return rule;
  }
  if (confirmPin.length === 4 && newPin !== confirmPin) return 'LOGIN.SETUP_PIN_MISMATCH';
  return null;
}

get setupReady(): boolean {
  const { newPin, confirmPin } = this.setupForm.getRawValue();
  return !this.setupSubmitting && !this.pinRuleKey(newPin) && newPin === confirmPin;
}

/** Digits only in the PIN boxes, whatever the keyboard sends. */
onSetupPinInput(name: 'newPin' | 'confirmPin', event: Event): void {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, '').slice(0, 4);
  if (digits !== input.value) input.value = digits;
  this.setupForm.controls[name].setValue(digits);
  this.setupError = '';
}

cancelSetup(): void {
  this.setup = null;
  this.setupError = '';
  this.setupForm.reset();
  this.loginForm.patchValue({ password: '' });
  this.cdr.detectChanges();
}

submitSetup(): void {
  if (!this.setup || !this.setupReady) {
    return;
  }
  const { newPin } = this.setupForm.getRawValue();
  this.setupError = '';
  this.setupSubmitting = true;
  const body = {
    deviceToken: this.device.token(),
    staffCode: this.setup.staffCode,
    pin: this.setup.pin,
    branchUID: this.setup.branchUID,
    // Empty: keep the code they have.
    newCode: this.chosenCode,
    newPin,
  };
  this.http.post<StaffLoginReply>(`${this.api}/authentication/staffSetup`, body).subscribe({
    next: (res) => {
      this.setupSubmitting = false;
      if (!res?.token) {
        this.setupError = this.translate.instant('LOGIN.STAFF_INVALID');
        this.cdr.detectChanges();
        return;
      }
      this.setup = null;
      this.staffSignedIn(res.token);
    },
    error: (err) => {
      const code = err?.error?.code;
      this.setupSubmitting = false;
      this.auth.removeToken();
      this.setupError = this.staffErrorMessage(err?.error);
      if (code === 'CODE_TAKEN') {
        // Someone took it in the meantime: back to keeping theirs, pick again.
        this.setup = this.setup && {
          ...this.setup,
          suggestions: this.setup.suggestions.filter((c) => c !== this.chosenCode),
        };
        this.chosenCode = '';
      } else if (code === 'ALREADY_SET' || code === 'INVALID_STAFF_LOGIN' || code === 'STAFF_LOCKED'
          || code === 'NO_PIN_SET' || code === 'SUBSCRIPTION_EXPIRED') {
        // Nothing to choose any more: back to the sign-in form, saying why.
        this.loginError = this.setupError;
        this.setup = null;
        this.loginForm.patchValue({ password: '' });
      }
      this.cdr.detectChanges();
    },
  });
}

  // Set when login fails because the branch has lapsed, so the screen can
  // offer a way to pay instead of leaving the customer stuck.
  subscriptionExpired = false;
  /** Set once the USSD push is out, so the screen stops showing the expiry error. */
  paymentSent = false;
  /** PENDING or FAILED from the last attempt, when there was one. */
  subscriptionStatus: string | null = null;
  /** Snippe's own wording for the decline, used to pick a message - never shown as-is. */
  paymentFailure: string | null = null;

  /** What to tell them beyond "expired", given how the last attempt went. */
  get expiredHelpKey(): string {
    if (this.subscriptionStatus === 'FAILED') {
      // The reason is matched, not printed. Snippe's wording is written for
      // a developer reading a log, in English, and the rest of this screen
      // is neither - so a recognised decline gets our own sentence and
      // anything unrecognised falls back to the general one.
      const reason = (this.paymentFailure ?? '').toLowerCase();
      if (/insufficient|balance|funds|salio/.test(reason)) {
        return 'LOGIN.EXPIRED_HELP_NO_BALANCE';
      }
      if (/timeout|timed out|expired|no response|not approved/.test(reason)) {
        return 'LOGIN.EXPIRED_HELP_TIMEOUT';
      }
      return 'LOGIN.EXPIRED_HELP_FAILED';
    }
    if (this.subscriptionStatus === 'PENDING') {
      return 'LOGIN.EXPIRED_HELP_PENDING';
    }
    return 'LOGIN.EXPIRED_HELP';
  }
  expiredBranchName = '';
  expiredMonthlyAmount: number | null = null;

  openSubscribeDialog(): void {
    const dialogRef = this.dialog.open(SubscribeDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        subscriptionAmount: this.expiredMonthlyAmount,
        // No token exists yet, so the backend verifies these again.
        credentials: {
          username: this.loginForm.value.username,
          password: this.loginForm.value.password,
        },
      },
    });

    dialogRef.afterClosed().subscribe((initiated) => {
      if (initiated) {
        // The dialog closes itself two seconds after the USSD push goes out,
        // leaving this screen behind it. Without clearing the error, what the
        // customer is left looking at is the expiry message again - which
        // reads as if paying had failed.
        this.loginError = '';
        this.subscriptionExpired = false;
        this.paymentSent = true;
      }
      this.cdr.markForCheck();
    });
  }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
}

