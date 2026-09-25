import { ChangeDetectorRef, Component, Inject, Optional, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Service } from '../../../../settings/service';
import { AlertService } from '../../../services/alert';

interface NetworkOption {
  value: string;
  label: string;
}

interface SubscribeDialogData {
  subscriptionAmount: number | null;
  /**
   * Present only when the dialog is opened from the login screen. There is no
   * token in that case, so the backend re-checks these instead.
   */
  credentials?: { username: string; password: string };
}

/**
 * Snippe rejects anything under this with its own raw English message. We
 * check the total here so that text never reaches a customer - the dialog
 * shows its own translated message instead, and no request is sent at all.
 */
const MINIMUM_PAYMENT_AMOUNT = 500;

@Component({
  selector: 'app-subscribe-dialog-component',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './subscribe-dialog-component.html',
  styleUrl: './subscribe-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscribeDialogComponent {

  networks: NetworkOption[] = [
    { value: 'MPESA', label: 'M-Pesa (Vodacom)' },
    { value: 'TIGO_PESA', label: 'Tigo Pesa / Mixx by Yas' },
    { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
    { value: 'HALOTEL', label: 'Halotel / HaloPesa' },
  ];

  monthOptions = [1, 3, 6, 12];

  /**
   * What each choice costs, so the price is on the button being pressed
   * rather than only in the total underneath it. Null when the branch has no
   * plan configured - there is no figure to show and none worth inventing.
   */
  amountFor(months: number): string | null {
    if (!this.monthlyAmount) {
      return null;
    }
    return (this.monthlyAmount * months).toLocaleString('en-US') + ' TZS';
  }

  mobileNetwork = '';
  phoneNumber = '';
  months: number | null = null;

  saving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<SubscribeDialogComponent>,
    private service: Service,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: SubscribeDialogData | null,
  ) { }

  // Null when the branch has no plan configured, or when the dialog was
  // opened from somewhere that didn't pass it - in that case we can't check
  // anything client-side and simply let the backend answer.
  get monthlyAmount(): number | null {
    return this.data?.subscriptionAmount ?? null;
  }

  get totalAmount(): number | null {
    return this.monthlyAmount && this.months ? this.monthlyAmount * this.months : null;
  }

  get belowMinimum(): boolean {
    return this.totalAmount !== null && this.totalAmount < MINIMUM_PAYMENT_AMOUNT;
  }

  readonly minimumAmount = MINIMUM_PAYMENT_AMOUNT;

  get canSubmit(): boolean {
    return (
      !this.saving &&
      this.mobileNetwork.trim().length > 0 &&
      this.phoneNumber.trim().length >= 9 &&
      !!this.months
    );
  }

  submit(): void {

    this.errorMessage = null;
    this.successMessage = null;

    if (!this.canSubmit) {
      return;
    }

    if (this.isOffline()) {
      this.showOfflineMessage();
      return;
    }

    // Caught here rather than at the backend on purpose: the provider's
    // rejection text is raw English and would also be popped a second time
    // by StatusInterceptor, which shows a dialog for any response carrying a
    // message. More months is the way out, so say that.
    if (this.belowMinimum) {
      this.errorMessage = this.translate.instant('SUBSCRIBE_DIALOG.MIN_AMOUNT', {
        min: MINIMUM_PAYMENT_AMOUNT,
        total: this.totalAmount,
      });
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;

    // Two ways in: from inside the app with a token, or from the login
    // screen where the subscription has lapsed and there is none yet. Same
    // form, same pricing, same outcome - only the endpoint differs.
    const request$ = this.data?.credentials
      ? this.service.payExpiredSubscription({
          username: this.data.credentials.username,
          password: this.data.credentials.password,
          mobileNetwork: this.mobileNetwork,
          phoneNumber: this.phoneNumber.trim(),
          months: this.months as number,
        })
      : this.service.updateSubscription({
          mobileNetwork: this.mobileNetwork,
          phoneNumber: this.phoneNumber.trim(),
          months: this.months as number,
        });

    request$.subscribe({

      next: (res) => {

        this.saving = false;

        if (!res?.data) {
          this.errorMessage = res?.message || this.translate.instant('SUBSCRIBE_DIALOG.FAILED');
          this.cdr.detectChanges();
          return;
        }

        // Snippe hasn't confirmed anything yet at this point - this is just
        // the USSD push being triggered. Use 'info', not 'success': nothing
        // has actually succeeded until the customer authorises on their
        // phone and the webhook confirms it (see main-sidenav2's badge).
        const message: string = res?.message || this.translate.instant('SUBSCRIBE_DIALOG.INITIATED');
        this.successMessage = message;
        this.cdr.detectChanges();
        this.alertService.show('info', message);

        // Nothing left to do in this dialog - confirmation happens on the
        // customer's phone, not here. Give them a moment to read the
        // message, then close on its own instead of making them find the
        // close button.
        setTimeout(() => this.dialogRef.close(true), 2000);
      },

      error: (error) => {

        this.saving = false;

        if (this.isOffline()) {
          this.showOfflineMessage();
          return;
        }

        this.errorMessage =
          error?.error?.message ||
          (typeof error?.error === 'string' ? error.error : null) ||
          this.translate.instant('SUBSCRIBE_DIALOG.FAILED');

        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  private isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  private showOfflineMessage(): void {
    const message = this.translate.instant('SUBSCRIBE_DIALOG.NO_NETWORK');
    this.errorMessage = message;
    this.alertService.show('error', message);
    this.cdr.detectChanges();
  }
}
