import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Keeps installed copies of the app on the newest version.
 *
 * The service worker serves the copy it has, so without this a phone kept
 * running an old build after a deploy - refreshing did not help - until
 * every tab of the app had been closed. Now the worker is asked for updates
 * when the app opens, every few minutes and when the screen comes back; once
 * a new version is downloaded the page reloads onto it: at once on the
 * landing or login page, otherwise at the next change of page, so nobody is
 * cut off mid-sale.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private sw = inject(SwUpdate);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private ready = false;

  start(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sw.isEnabled) {
      return;
    }
    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.ready = true;
        if (this.atStart()) {
          this.reload();
        }
      });
    // The next page change lands on the new version instead.
    this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe((e) => {
      if (this.ready) {
        this.ready = false;
        this.sw.activateUpdate().finally(() => location.assign((e as NavigationStart).url));
      }
    });
    const check = () => {
      if (navigator.onLine) {
        this.sw.checkForUpdate().catch(() => {});
      }
    };
    check();
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    });
  }

  private atStart(): boolean {
    const path = location.pathname;
    return path === '/' || path.startsWith('/login');
  }

  private reload(): void {
    this.ready = false;
    this.sw.activateUpdate().finally(() => location.reload());
  }
}
