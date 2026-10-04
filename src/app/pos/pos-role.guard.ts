import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authentication } from '../Utils/services/authentication';

// Roles that see every POS section, including Setting. MANAGER and
// CASHIER are deliberately left out.
export const POS_FULL_ACCESS_ROLES = ['ROOT', 'STAFF', 'DIRECTOR', 'CEO'];

// Hiding the sidenav item isn't enough on its own - a MANAGER/CASHIER could
// still type /pos/barSetting into the address bar. This sends them back
// to the POS home instead. The backend's @PreAuthorize checks remain the
// real security boundary.
export const posFullAccessGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return POS_FULL_ACCESS_ROLES.some(role => auth.hasRole(role))
    ? true
    : router.createUrlTree(['/pos']);
};

// CASHIER only works the till: no POS home, Staff, Store, Messages or Help. Where
// a cashier lands instead of any of those (search and typed URLs included).
export const CASHIER_HOME = '/pos/barSales';

// True for someone whose only POS role is CASHIER. A user who also holds
// MANAGER/CEO/etc. keeps what that other role sees.
export function isCashierOnly(auth: Authentication): boolean {
  return auth.hasRole('CASHIER')
    && ![...POS_FULL_ACCESS_ROLES, 'MANAGER'].some(role => auth.hasRole(role));
}

export const posNoCashierGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return isCashierOnly(auth) ? router.createUrlTree([CASHIER_HOME]) : true;
};
