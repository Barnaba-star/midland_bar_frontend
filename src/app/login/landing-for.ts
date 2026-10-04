import { CASHIER_HOME } from '../pos/pos-role.guard';

/**
 * Where a user starts after signing in - shared by login and anything that
 * sends them "home". The SUPERVISOR goes straight to their orders queue and
 * a CASHIER straight to the till (POS Sales); everyone else starts on the
 * Dashboard, where CEO and MANAGER find POS and Staff Sell - they open Staff
 * Sell for the staff, who are not users. A cashier still reaches the
 * Dashboard (and Staff Sell) through the sidenav logo.
 */
export function landingFor(hasRole: (role: string) => boolean): string {
  // Main office roles pick their area on the Dashboard.
  if (['ROOT', 'STAFF', 'DIRECTOR', 'ADMIN'].some(hasRole)) {
    return '/dashboard';
  }
  if (hasRole('SUPERVISOR')) {
    return '/supervisor';
  }
  // Cashier-only: a user who also holds CEO/MANAGER starts on the Dashboard.
  if (hasRole('CASHIER') && !['CEO', 'MANAGER'].some(hasRole)) {
    return CASHIER_HOME;
  }
  return '/dashboard';
}
