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

// STORE_KEEPER receives stock into the store and counts it - nothing on
// sales, reports or money. They start on the Store and are kept to it and
// the stock count.
export const STORE_KEEPER_HOME = '/pos/barStore';
export const STOCK_COUNT_ROUTE = '/pos/stockTake';

/** Any role that opens more than the store; holding one of these means not store-keeper-only. */
const BEYOND_STORE_ROLES = [...POS_FULL_ACCESS_ROLES, 'MANAGER', 'CASHIER', 'COUNTER', 'CHEF', 'SUPERVISOR', 'ADMIN'];

/** Same test as isStoreKeeperOnly, for places that only have a hasRole function (landingFor). */
export function storeKeeperOnly(hasRole: (role: string) => boolean): boolean {
  return hasRole('STORE_KEEPER') && !BEYOND_STORE_ROLES.some(hasRole);
}

/** True for someone whose only role is STORE_KEEPER. */
export function isStoreKeeperOnly(auth: Authentication): boolean {
  return storeKeeperOnly((role) => auth.hasRole(role));
}

/** Pages a store keeper has no business on send them back to the Store. */
export const posNoStoreKeeperGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return isStoreKeeperOnly(auth) ? router.createUrlTree([STORE_KEEPER_HOME]) : true;
};

/** The stock count on its own page: whoever may correct the store (SAVE_STORE; ROOT passes). */
export const stockCountGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  const router = inject(Router);
  return auth.hasPermission('SAVE_STORE') ? true : router.createUrlTree(['/pos']);
};
