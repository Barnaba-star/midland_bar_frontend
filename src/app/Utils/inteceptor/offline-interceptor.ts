import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, from, mergeMap, of, tap, throwError } from 'rxjs';
import { environment } from '../enviroments/environment';
import { AlertService } from '../services/alert';
import { OFFLINE_AWARE, OFFLINE_BYPASS, OfflineRefusal, OfflineService, OpKind } from '../offline/offline.service';
import { SILENT_REQUEST } from './silent-request';

/** Sales-page reads answered from this device while offline (or while queued work is waiting). */
const OVERLAYS: { match: RegExp; view: (o: OfflineService, m: RegExpMatchArray) => Promise<any> }[] = [
  { match: /^\/bar\/shift\/current$/, view: (o) => o.shiftView() },
  { match: /^\/bar\/salesOpenedList$/, view: (o) => o.openBillsView() },
  { match: /^\/bar\/findBarSalesList\/([^/?]+)$/, view: (o, m) => o.billLinesView(m[1]) },
  { match: /^\/bar\/findAvailableBillCodes$/, view: (o) => o.freeCodesView() },
  { match: /^\/bar\/findBillReceipt\/([^/?]+)$/, view: (o, m) => o.receiptView(m[1]) },
  // Staff Sell: a staff member's bills and orders ("summary" is a report, not a code).
  { match: /^\/bar\/staffSell\/(?!summary$)([^/?]+)$/, view: (o, m) => o.staffSellView(decodeURIComponent(m[1])) },
];

/** Sales-page writes that can be done offline and sent later. */
const QUEUEABLE: { match: RegExp; kind: OpKind }[] = [
  { match: /^\/bar\/shift\/open$/, kind: 'SHIFT_OPEN' },
  { match: /^\/bar\/shift\/close$/, kind: 'SHIFT_CLOSE' },
  { match: /^\/bar\/saveOpenSale$/, kind: 'OPEN_BILL' },
  { match: /^\/bar\/addSaleItems$/, kind: 'ADD_ITEMS' },
  { match: /^\/bar\/payBill$/, kind: 'PAY_BILL' },
  { match: /^\/bar\/staffSell\/openBill$/, kind: 'STAFF_OPEN_BILL' },
  { match: /^\/bar\/removeBillLine$/, kind: 'REMOVE_LINE' },
  { match: /^\/bar\/staffLoss$/, kind: 'STAFF_LOSS' },
];

const ok = (req: HttpRequest<any>, data: any) =>
  new HttpResponse({ status: 200, url: req.url, body: { data, message: null, status: 'SUCCESS' } });

/**
 * The Bar's offline layer, outermost of the interceptors.
 *
 * Reads (GET under /bar): every answer is kept on the device. With no
 * connection - or while this login's queued work is still going out - the
 * Sales page's reads are answered from that copy with the queued work laid
 * over it; any other read falls back to its last copy.
 *
 * Writes: the Sales page's (shift open/close, open bill, add items, pay) go
 * out with an op id, so a request whose answer is lost can be resent safely.
 * Offline, or behind queued work, they are checked here and queued instead.
 * Any other write needs the internet, and the queue to have gone first.
 */
export const OfflineInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const offline = inject(OfflineService);
  if (!offline.browser || req.context.get(OFFLINE_BYPASS)) {
    return next(req);
  }
  if (!req.url.startsWith(environment.baseApiUrl)) {
    // Icons, translations...: the service worker keeps them; a missing connection is no news worth a popup.
    return next(req.clone({ context: req.context.set(OFFLINE_AWARE, true) }));
  }
  const alert = inject(AlertService);
  const translate = inject(TranslateService);
  const path = req.url.substring(environment.baseApiUrl.length).split('?')[0];
  const aware = req.clone({ context: req.context.set(OFFLINE_AWARE, true) });

  const refuse = (code: string): Observable<never> => {
    // A poll (supervisor queue, Staff Sell) tries again on its own - no popup every few seconds.
    if (!req.context.get(SILENT_REQUEST)) {
      alert.show('error', translate.instant(`OFFLINE.${code}`));
    }
    return throwError(() => new HttpErrorResponse({ status: 0, url: req.url, error: { message: code, offline: true } }));
  };

  if (!path.startsWith('/bar/')) {
    // Sign-in, notifications, heartbeat...: as before, but quiet about a missing connection.
    return next(aware);
  }

  // ---------------- reads ----------------
  if (req.method === 'GET') {
    const overlay = OVERLAYS.map((o) => ({ o, m: path.match(o.match) })).find((x) => x.m);
    const fromDevice = (): Observable<HttpEvent<any>> =>
      from(overlay ? overlay.o.view(offline, overlay.m!) : offline.recall<any>(req.urlWithParams).then((b) => b?.data)).pipe(
        mergeMap((data) => (data === undefined || data === null ? refuse('NOT_CACHED') : of(ok(req, data)))),
      );
    if (offline.queueing && overlay) {
      return fromDevice();
    }
    return next(aware).pipe(
      tap((ev) => {
        if (ev instanceof HttpResponse && ev.status === 200 && ev.body && (ev.body as any).data !== undefined) {
          offline.remember(req.urlWithParams, ev.body);
        }
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 0) {
          return throwError(() => err);
        }
        offline.setOffline();
        return fromDevice();
      }),
    );
  }

  // ---------------- writes ----------------
  const q = QUEUEABLE.find((x) => x.match.test(path));
  const queue = (id: string, body: any): Observable<HttpEvent<any>> => {
    const run = (): Promise<any> => {
      switch (q!.kind) {
        case 'SHIFT_OPEN': return offline.queueShiftOpen(req.url, id);
        case 'SHIFT_CLOSE': return offline.queueShiftClose(req.url, id);
        case 'OPEN_BILL': return offline.queueOpenBill(req.url, body, id);
        case 'ADD_ITEMS': return offline.queueAddItems(req.url, body, id);
        case 'PAY_BILL': return offline.queuePayBill(req.url, body, id);
        case 'STAFF_OPEN_BILL': return offline.queueStaffOpenBill(req.url, body, id);
        case 'REMOVE_LINE': return offline.queueRemoveLine(req.url, body, id);
        case 'STAFF_LOSS': return offline.queueStaffLoss(req.url, body, id);
        default: return Promise.reject(new OfflineRefusal('NEEDS_INTERNET'));
      }
    };
    return from(run()).pipe(
      mergeMap((data) => of(ok(req, data))),
      catchError((e) => (e instanceof OfflineRefusal ? refuse(e.message) : throwError(() => e))),
    );
  };

  if (q && !(q.kind === 'OPEN_BILL' && req.body?.uid)) {
    const id = offline.newId();
    let body = req.body;
    if ((q.kind === 'OPEN_BILL' || q.kind === 'STAFF_OPEN_BILL') && !body?.clientUid) {
      body = { ...body, clientUid: offline.newId() };
    }
    if (offline.queueing || (q.kind === 'REMOVE_LINE' && String(body?.barSalesUID ?? '').startsWith('offline-'))) {
      return queue(id, body);
    }
    return next(aware.clone({ body, setHeaders: { 'X-Op-Id': id } })).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 0) {
          return throwError(() => err);
        }
        // No answer: maybe it never arrived, maybe the answer was lost. Queued
        // with the same id, the server applies it once either way.
        offline.setOffline();
        return queue(id, body);
      }),
    );
  }

  // ---------------- Staff Sell ----------------
  const answer = (p: Promise<any>): Observable<HttpEvent<any>> =>
    from(p).pipe(
      mergeMap((data) => of(ok(req, data))),
      catchError((e) => (e instanceof OfflineRefusal ? refuse(e.message) : throwError(() => e))),
    );
  if (/^\/bar\/staffOrders\/addItem$/.test(path) && offline.queueing) {
    // Written offline: kept on the device until Send.
    return answer(offline.addStaffDraftItem(req.body));
  }
  const removeLine = path.match(/^\/bar\/staffOrders\/([^/]+)\/removeLine\/([^/]+)$/);
  if (removeLine && offline.isLocalOrder(removeLine[1])) {
    return answer(offline.removeDraftLine(removeLine[1], removeLine[2]));
  }
  const send = path.match(/^\/bar\/staffOrders\/send\/([^/]+)$/);
  if (send && (offline.queueing || offline.hasLocalDrafts(decodeURIComponent(send[1])))) {
    // No supervisor to see it: straight onto the bill, looked over once it reaches the server.
    return answer(offline.sendStaffDrafts(decodeURIComponent(send[1])));
  }
  if (/^\/bar\/staffSell\/unlock$/.test(path)) {
    if (!offline.online()) {
      // A manager's login the device saw open Staff Sell online.
      return from(offline.verifyUnlock(req.body?.username, req.body?.password)).pipe(
        mergeMap((okay) => (okay ? of(ok(req, true)) : refuse('UNLOCK_FAILED'))),
      );
    }
    return next(aware).pipe(
      tap((ev) => {
        if (ev instanceof HttpResponse && (ev.body as any)?.data === true) {
          offline.rememberUnlock(req.body?.username, req.body?.password);
        }
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 0) {
          return throwError(() => err);
        }
        offline.setOffline();
        return from(offline.verifyUnlock(req.body?.username, req.body?.password)).pipe(
          mergeMap((okay) => (okay ? of(ok(req, true)) : refuse('UNLOCK_FAILED'))),
        );
      }),
    );
  }

  if (!offline.online()) {
    return refuse('NEEDS_INTERNET');
  }
  if (offline.pending().length) {
    offline.sync();
    return refuse('WAIT_SYNC');
  }
  return next(req);
};
