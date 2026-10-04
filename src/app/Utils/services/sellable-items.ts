import { Injectable } from '@angular/core';
import { Observable, map, shareReplay, tap, finalize } from 'rxjs';
import { ServiceBarMethod } from '../../pos/service-bar-method';

/**
 * The drinks and dishes that can go on a bill, kept in memory so the
 * add-item dialog opens with them at once - waiting on the server every
 * time made a busy till slow. The list is refreshed behind the scenes each
 * time the dialog opens, so prices and stock stay current.
 */
@Injectable({ providedIn: 'root' })
export class SellableItems {
  private items: any[] | null = null;
  private inflight: Observable<any[]> | null = null;

  constructor(private barService: ServiceBarMethod) {}

  /** What is in memory now, or null before the first load. */
  current(): any[] | null {
    return this.items;
  }

  /** Fetch the list again (one request at a time, shared). */
  refresh(): Observable<any[]> {
    if (!this.inflight) {
      this.inflight = this.barService.findBarServiceList().pipe(
        // Stock items (beef, goat meat) are sold through the services made from them, never on their own.
        map((res) => (res.data ?? []).filter((s: any) => s.kind !== 'STOCK_ITEM')),
        tap((items) => (this.items = items)),
        finalize(() => (this.inflight = null)),
        shareReplay(1),
      );
    }
    return this.inflight;
  }

  /** Load it ahead of time - the Sales and Staff Sell pages call this when they open. */
  prefetch(): void {
    if (!this.items) {
      this.refresh().subscribe({ error: () => {} });
    }
  }
}
