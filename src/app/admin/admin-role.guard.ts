import { landingFor } from '../login/landing-for';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authentication } from '../Utils/services/authentication';

/**
 * Who reaches Admin. It holds what branches are asking and what we publish
 * back to them - running the business, not configuring the system, which is
 * why it is its own area rather than two more Settings entries.
 *
 * STAFF is deliberately out: they register branches, they do not answer for
 * the platform.
 */
export const ADMIN_ROLES = ['ROOT', 'DIRECTOR', 'ADMIN'];

const hasAnyRole = (auth: Authentication, roles: string[]): boolean =>
  roles.some(role => auth.hasRole(role));

/** Where Admin opens - the thing most likely to be waiting. */
export const adminLandingRoute = '/admin/messages';

/*
 * Hiding a menu item is not enough on its own: the page could still be
 * opened by typing its URL. The backend's @PreAuthorize checks remain the
 * real boundary - this only decides what is worth showing.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return hasAnyRole(auth, ADMIN_ROLES) ? true : router.createUrlTree([landingFor((role) => auth.hasRole(role))]);
};

/** ROOT only within Admin (Regions); anyone else goes back to Admin's landing. */
export const ADMIN_ROOT_ONLY_ROLES = ['ROOT'];

export const adminRootOnlyGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return hasAnyRole(auth, ADMIN_ROOT_ONLY_ROLES) ? true : router.createUrlTree([adminLandingRoute]);
};

/** Payments and Payroll inside Admin: ROOT and DIRECTOR only. */
export const ADMIN_MANAGE_ROLES = ['ROOT', 'DIRECTOR'];

export const adminManageGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return hasAnyRole(auth, ADMIN_MANAGE_ROLES) ? true : router.createUrlTree([adminLandingRoute]);
};
