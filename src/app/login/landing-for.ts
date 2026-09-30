/**
 * Where a user starts after signing in - shared by login and anything that
 * sends them "home". The SUPERVISOR goes straight to their orders queue;
 * everyone else starts on the Dashboard, where the till roles (CEO, MANAGER,
 * CASHIER) find POS and Staff Sell - they open Staff Sell for the staff, who
 * are not users.
 */
export function landingFor(hasRole: (role: string) => boolean): string {
  // Main office roles pick their area on the Dashboard.
  if (['ROOT', 'STAFF', 'DIRECTOR', 'ADMIN'].some(hasRole)) {
    return '/dashboard';
  }
  if (hasRole('SUPERVISOR')) {
    return '/supervisor';
  }
  return '/dashboard';
}
