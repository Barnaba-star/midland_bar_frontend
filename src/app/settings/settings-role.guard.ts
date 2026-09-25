import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authentication } from '../Utils/services/authentication';

// Who reaches Settings at all. CEO/MANAGER/CASHIER are sent back to POS.
export const SETTINGS_ROLES = ['ROOT', 'DIRECTOR', 'STAFF'];

// Role + Users: ROOT and DIRECTOR. STAFF only gets Branch.
export const SETTINGS_MANAGE_ROLES = ['ROOT', 'DIRECTOR'];

// Permission, Config and Storage are ROOT only.
export const SETTINGS_ROOT_ONLY_ROLES = ['ROOT'];

const hasAnyRole = (auth: Authentication, roles: string[]): boolean =>
  roles.some(role => auth.hasRole(role));

// Where each role lands when they open Settings (or get bounced out of a
// section they can't see): the first section they're allowed to open.
export const settingsLandingRoute = (auth: Authentication): string =>
  hasAnyRole(auth, SETTINGS_MANAGE_ROLES) ? '/settings/role' : '/settings/node';

// Hiding a sidenav item isn't enough on its own - the section could still
// be opened by typing its URL. The backend's @PreAuthorize checks remain
// the real security boundary.
const requireAnyRole = (roles: string[]): CanActivateFn => () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return hasAnyRole(auth, roles) ? true : router.createUrlTree([settingsLandingRoute(auth)]);
};

export const settingsGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return hasAnyRole(auth, SETTINGS_ROLES) ? true : router.createUrlTree(['/pos']);
};

export const settingsManageGuard = requireAnyRole(SETTINGS_MANAGE_ROLES);
export const settingsRootOnlyGuard = requireAnyRole(SETTINGS_ROOT_ONLY_ROLES);
