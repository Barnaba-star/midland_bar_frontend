/*
 * A signed-in branch was blocked by the main office: the status interceptor
 * signs them out and leaves the reason here for the login screen to show,
 * once. Session storage, so it survives the navigation (and a refresh on
 * /login) but not a new tab days later.
 */
const KEY = 'bar_branch_blocked';

export interface BranchBlockedInfo {
  branchName: string;
  reason: string;
}

export function rememberBranchBlocked(branchName?: string | null, reason?: string | null): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ branchName: branchName ?? '', reason: reason ?? '' }));
  } catch {
    // Storage blocked: the login screen just shows the plain form.
  }
}

/** The kept notice, removed as it is read - so it is shown once. */
export function takeBranchBlocked(): BranchBlockedInfo | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    return { branchName: parsed?.branchName ?? '', reason: parsed?.reason ?? '' };
  } catch {
    return null;
  }
}
