import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * A request a screen makes on its own every few seconds (the supervisor's
 * queue, Staff Sell waiting on it). It shows no loader and no dialogs: a
 * spinner every five seconds, or an error popup every five seconds while the
 * network is down, would bury the screen. The next poll tries again.
 */
export const SILENT_REQUEST = new HttpContextToken<boolean>(() => false);

export const silent = () => new HttpContext().set(SILENT_REQUEST, true);
