import { Authentication } from '../../Utils/services/authentication';

/*
 * The counter sells too: customers sitting at the counter order there. Its
 * "Bili zangu" swaps the COUNTER login for a staff session as itself (own
 * bills, orders, handover - never payment), keeping the login aside to come
 * back to the orders queue without signing in again. Kept in this browser
 * only, so a refresh on Staff Sell still knows the way back.
 */
const KEY = 'bar_counter_login';

export function borrowCounterSession(auth: Authentication, staffToken: string): void {
  try {
    localStorage.setItem(KEY, auth.getToken());
  } catch {
    // Storage blocked: leaving Staff Sell signs out instead of going back.
  }
  auth.setToken(staffToken);
}

export function isCounterSession(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** Back to the COUNTER login. False when there was none to go back to. */
export function returnFromCounterSession(auth: Authentication): boolean {
  let login: string | null = null;
  try {
    login = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
  if (!login) {
    return false;
  }
  auth.setToken(login);
  return true;
}
