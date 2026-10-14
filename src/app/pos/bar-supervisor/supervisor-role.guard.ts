import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authentication } from '../../Utils/services/authentication';

/** Who may open the orders screen: the COUNTER, the CHEF (and an older SUPERVISOR), and the roles above them. */
/** The roles that are a place orders are received - each sees only its own (backend OrderStation). */
export const ORDER_STATIONS = ['COUNTER', 'CHEF', 'JUICE', 'BISS', 'SHISHER'];

export const SUPERVISOR_SCREEN_ROLES = [...ORDER_STATIONS, 'SUPERVISOR', 'ROOT', 'STAFF', 'DIRECTOR', 'ADMIN', 'CEO', 'MANAGER'];

export const supervisorGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  return SUPERVISOR_SCREEN_ROLES.some((r) => auth.hasRole(r)) ? true : inject(Router).createUrlTree(['/pos']);
};
