import { Injectable, signal } from '@angular/core';

/**
 * How much work is out. Counted, not on/off: with three requests in flight,
 * the first to finish must not hide the bar while the other two still run.
 *
 * Shown only after a short wait, so a request that answers at once does not
 * flash the bar, and kept a moment after the last one ends so it can finish
 * its sweep instead of vanishing mid-way.
 */
@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private static readonly SHOW_AFTER_MS = 150;
  private static readonly HIDE_AFTER_MS = 200;

  private pending = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** True while the progress bar is on screen. */
  readonly loading = signal(false);

  show(): void {
    this.pending++;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (!this.loading() && !this.showTimer) {
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (this.pending > 0) {
          this.loading.set(true);
        }
      }, LoaderService.SHOW_AFTER_MS);
    }
  }

  hide(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending > 0) {
      return;
    }
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.loading() && !this.hideTimer) {
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        this.loading.set(false);
      }, LoaderService.HIDE_AFTER_MS);
    }
  }
}
