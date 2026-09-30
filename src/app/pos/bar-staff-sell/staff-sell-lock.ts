import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/*
 * While a till is handed to staff at Staff Sell, it stays there: POS, the
 * dashboard, Settings and Admin all send it back until a manager's login
 * lets it out. Kept per device, so a refresh, the browser's back button or a
 * reopened tab does not slip past it. Signing in again clears it - that is a
 * manager proving who they are.
 */
const KEY = 'bar_staff_sell_lock';

export function lockStaffSell(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Storage blocked - the exit button's login still stands in the way.
  }
}

export function unlockStaffSell(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored, nothing to clear.
  }
}

export function isStaffSellLocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const staffSellLockGuard: CanActivateFn = () =>
  isStaffSellLocked() ? inject(Router).createUrlTree(['/staff-sell']) : true;
