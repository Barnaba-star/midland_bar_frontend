import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../pos/service-bar-method';
import { LoyaltyCard } from '../../../pos/BarModel';

/**
 * The customer names themselves: phone number + their own PIN, typed by
 * them (the waiter never sees it). With billUid the bill is marked as theirs
 * (it counts towards their reward). A number with no PIN yet - or not
 * registered at all - turns into "set your PIN" (name too for a new one).
 * Emits the customer once known.
 */
@Component({
  selector: 'app-customer-pin',
  imports: [FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './customer-pin.html',
  styleUrl: './customer-pin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerPin {
  @Input() billUid?: string;
  @Output() found = new EventEmitter<LoyaltyCard>();

  mode: 'pin' | 'register' = 'pin';
  /** Registering a number Madeni has never seen: the name is asked too. */
  isNew = false;
  phone = '';
  pin = '';
  pin2 = '';
  name = '';
  busy = false;
  error = '';

  constructor(
    private bar: ServiceBarMethod,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  digits(v: string, max: number): string {
    return (v || '').replace(/\D/g, '').slice(0, max);
  }

  get canCheck(): boolean {
    return !this.busy && this.phone.replace(/\D/g, '').length >= 9 && this.pin.length === 4;
  }

  get canRegister(): boolean {
    return !this.busy && this.pin.length === 4 && this.pin === this.pin2 && (!this.isNew || this.name.trim().length >= 2);
  }

  check(): void {
    if (!this.canCheck) {
      return;
    }
    this.busy = true;
    this.error = '';
    this.bar.loyaltyIdentify({ phone: this.phone, pin: this.pin }, this.billUid).subscribe({
      next: (res) => this.done(res?.data, res?.message),
      error: (err) => this.refused(err?.error?.message),
    });
  }

  register(): void {
    if (!this.canRegister) {
      return;
    }
    this.busy = true;
    this.error = '';
    this.bar.loyaltyRegister({ name: this.isNew ? this.name.trim() : undefined, phone: this.phone, pin: this.pin }).subscribe({
      next: (res) => {
        if (!res?.data) {
          this.refused(res?.message);
          return;
        }
        // Registered: now put the bill on them (or just report who they are).
        this.mode = 'pin';
        this.pin2 = '';
        this.check();
      },
      error: (err) => this.refused(err?.error?.message),
    });
  }

  back(): void {
    this.mode = 'pin';
    this.pin = '';
    this.pin2 = '';
    this.error = '';
  }

  private done(card?: LoyaltyCard, message?: string): void {
    this.busy = false;
    if (card) {
      this.pin = '';
      this.found.emit(card);
    } else {
      this.error = message || this.translate.instant('CUSTOMER_PIN.FAILED');
    }
    this.cdr.markForCheck();
  }

  private refused(code?: string): void {
    this.busy = false;
    this.pin = '';
    if (code === 'CUSTOMER_NOT_REGISTERED' || code === 'CUSTOMER_PIN_NOT_SET') {
      this.isNew = code === 'CUSTOMER_NOT_REGISTERED';
      this.mode = 'register';
      this.error = '';
    } else if (code === 'WRONG_CUSTOMER_PIN') {
      this.error = this.translate.instant('CUSTOMER_PIN.WRONG');
    } else {
      this.error = code || this.translate.instant('CUSTOMER_PIN.FAILED');
    }
    this.cdr.markForCheck();
  }
}
