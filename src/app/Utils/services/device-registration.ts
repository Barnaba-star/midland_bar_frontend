import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../enviroments/environment';
import { silent } from '../inteceptor/silent-request';

const KEY = 'bar_device';

interface DeviceTicket {
  token: string;
  branchName: string | null;
  at: number;
}

/**
 * Which branch this device belongs to, for staff signing in with their code.
 *
 * Staff codes are only unique within a branch, so a code alone cannot say
 * whose it is. When a member of the branch signs in on a device, the backend
 * hands it a signed ticket naming the branch; staff code sign-in presents it.
 * Kept in localStorage: it must outlive sign-outs, and it only says "this
 * device is the bar's" - it opens nothing by itself.
 */
@Injectable({ providedIn: 'root' })
export class DeviceRegistration {
  private http = inject(HttpClient);

  /** Ask for (or refresh) this device's ticket - after an ordinary sign-in. */
  register(): void {
    this.http
      .post<{ deviceToken: string; branchName: string | null }>(`${environment.baseApiUrl}/bar/device/register`, {}, { context: silent() })
      .subscribe({
        next: (res) => {
          if (res?.deviceToken) {
            this.save({ token: res.deviceToken, branchName: res.branchName ?? null, at: Date.now() });
          }
        },
        // A login that cannot sell here (view only) gets no ticket - fine.
        error: () => {},
      });
  }

  token(): string | null {
    return this.read()?.token ?? null;
  }

  branchName(): string | null {
    return this.read()?.branchName ?? null;
  }

  private read(): DeviceTicket | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as DeviceTicket) : null;
    } catch {
      return null;
    }
  }

  private save(ticket: DeviceTicket): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(ticket));
    } catch {
      // Private mode or storage off: staff code sign-in just will not work here.
    }
  }
}
