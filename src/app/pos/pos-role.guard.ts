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
