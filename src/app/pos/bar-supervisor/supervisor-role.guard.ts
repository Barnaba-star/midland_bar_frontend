import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Authentication } from '../../Utils/services/authentication';

/** Who may open the orders screen: the COUNTER, the CHEF (and an older SUPERVISOR), and the roles above them. */
export const SUPERVISOR_SCREEN_ROLES = ['COUNTER', 'CHEF', 'SUPERVISOR', 'ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER'];

export const supervisorGuard: CanActivateFn = () => {
  const auth = inject(Authentication);
  return SUPERVISOR_SCREEN_ROLES.some((r) => auth.hasRole(r)) ? true : inject(Router).createUrlTree(['/pos']);
};
