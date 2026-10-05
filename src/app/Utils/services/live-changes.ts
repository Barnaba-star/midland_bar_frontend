import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject, debounceTime, filter, finalize, share } from 'rxjs';
import { environment } from '../enviroments/environment';
import { Authentication } from './authentication';

/**
 * Live nudges from the backend's /bar/live stream: "orders" or "bills"
 * changed in this branch, so a screen fetches again at once instead of
 * waiting for its next poll. Only topic names arrive, never data.
 *
 * Read with fetch, not EventSource: the token goes in the Authorization
 * header (the login cookie belongs to the site, not the API's domain).
 * Connected while some screen listens; reconnects by itself.
 */
@Injectable({ providedIn: 'root' })
export class LiveChanges {
  private auth = inject(Authentication);
  private zone = inject(NgZone);
  private topics = new Subject<string>();
  /** Named events with a body, e.g. "pending": the supervisor's queue as JSON. */
  private events = new Subject<{ event: string; data: string }>();
  private abort: AbortController | null = null;
  private retryMs = 1000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Nudges missed while disconnected are lost: a reconnect counts as "everything changed". */
  private connectedOnce = false;

  constructor() {
    // A phone back from sleep: reconnect now, not after the backoff.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.topics.observed && !this.abort) {
          if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
          }
          this.retryMs = 1000;
          this.connect();
        }
      });
    }
  }

  private readonly shared$ = new Observable<string>((sub) => {
    const s = this.topics.subscribe(sub);
    this.connect();
    return () => s.unsubscribe();
  }).pipe(
    finalize(() => this.disconnect()),
    share(),
  );

  /**
   * One topic's nudges, bursts folded into one (a pay touches several bills).
   * "resync" (back after a drop - nudges may have been missed) always passes.
   */
  on(...topics: string[]): Observable<string> {
    return this.shared$.pipe(filter((t) => t === 'resync' || topics.includes(t)), debounceTime(150));
  }

  /** The supervisor's queue as it stands, sent with every order change - no fetch, no delay. */
  pending<T>(): Observable<T[]> {
    return new Observable<T[]>((sub) => {
      const keepOpen = this.shared$.subscribe();
      const s = this.events.pipe(filter((e) => e.event === 'pending')).subscribe((e) => {
        try {
          sub.next(JSON.parse(e.data) as T[]);
        } catch {
          // A broken body: the screen's poll still catches up.
        }
      });
      return () => {
        s.unsubscribe();
        keepOpen.unsubscribe();
      };
    });
  }

  private connect(): void {
    if (this.abort) {
      return;
    }
    const token = this.auth.getToken();
    if (!token || typeof fetch === 'undefined') {
      return;
    }
    const abort = new AbortController();
    this.abort = abort;
    // Outside Angular: a long-running read must not keep change detection busy.
    this.zone.runOutsideAngular(() => {
      fetch(`${environment.baseApiUrl}/bar/live`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: abort.signal,
        cache: 'no-store',
      })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            throw new Error('live ' + res.status);
          }
          this.retryMs = 1000;
          if (this.connectedOnce) {
            this.zone.run(() => this.topics.next('resync'));
          }
          this.connectedOnce = true;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            let cut: number;
            while ((cut = buffer.indexOf('\n\n')) >= 0) {
              this.handle(buffer.slice(0, cut));
              buffer = buffer.slice(cut + 2);
            }
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (this.abort === abort) {
            this.abort = null;
            this.scheduleReconnect();
          }
        });
    });
  }

  private handle(block: string): void {
    const lines = block.split('\n');
    const event = lines.find((l) => l.startsWith('event:'))?.slice(6).trim() || 'change';
    const data = lines
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data || data === 'hello') {
      return;
    }
    this.zone.run(() => {
      if (event === 'change') {
        this.topics.next(data.trim());
      } else {
        this.events.next({ event, data });
      }
    });
  }

  private scheduleReconnect(): void {
    if (!this.topics.observed || this.retryTimer) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, 30000);
  }

  private disconnect(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const abort = this.abort;
    this.abort = null;
    abort?.abort();
  }
}
