import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../enviroments/environment';
import { AlertService } from '../services/alert';
import { OfflineService } from '../offline/offline.service';
import { OfflineInterceptor } from './offline-interceptor';

const BAR = `${environment.baseApiUrl}/bar`;

const tick = (ms: number) => jasmine.clock().tick(ms);
/** Lets the device's promises (IndexedDB stand-ins) settle. */
const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

/** A weak line: requests that neither answer nor fail. */
describe('OfflineInterceptor on a slow line', () => {
  let http: HttpClient;
  let line: HttpTestingController;
  let offline: any;

  beforeEach(() => {
    offline = {
      browser: true,
      online: signal(true),
      weak: signal(false),
      pending: signal([]),
      queueing: false,
      user: () => 'cashier',
      remember: jasmine.createSpy('remember'),
      recall: jasmine.createSpy('recall').and.resolveTo(undefined),
      instantRecall: jasmine.createSpy('instantRecall').and.resolveTo(undefined),
      instantRemember: jasmine.createSpy('instantRemember'),
      openBillsView: () => Promise.resolve([{ uid: 'b1', salesCode: 'A1' }]),
      shiftView: () => Promise.resolve({ state: 'OPEN' }),
      setOffline: jasmine.createSpy('setOffline'),
      newId: () => 'op-1',
      queueAddItems: jasmine.createSpy('queueAddItems').and.resolveTo({ queued: true }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([OfflineInterceptor])),
        provideHttpClientTesting(),
        { provide: OfflineService, useValue: offline },
        { provide: AlertService, useValue: { show: () => {} } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    });
    jasmine.clock().install();
    http = TestBed.inject(HttpClient);
    line = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('answers a fast read from the server', async () => {
    let got: any;
    http.get(`${BAR}/salesOpenedList`).subscribe((r) => (got = r));
    line.expectOne(`${BAR}/salesOpenedList`).flush({ data: [{ uid: 'server' }] });
    tick(10000);
    expect(got.data[0].uid).toBe('server');
    expect(offline.weak()).toBeFalse();
  });

  it('answers a slow selling read from the device, and lets the request refresh the copy', async () => {
    let got: any;
    http.get(`${BAR}/salesOpenedList`).subscribe((r) => (got = r));
    tick(5999);
    await flushMicrotasks();
    expect(got).toBeUndefined();
    tick(1);
    await flushMicrotasks();
    expect(got.data[0].salesCode).toBe('A1');
    expect(offline.weak()).toBeTrue();

    const req = line.expectOne(`${BAR}/salesOpenedList`);
    expect(req.cancelled).toBeFalse();
    req.flush({ data: [{ uid: 'later' }] });
    expect(offline.remember).toHaveBeenCalledWith(`${BAR}/salesOpenedList`, { data: [{ uid: 'later' }] });
    expect(offline.weak()).toBeFalse();
  });

  it('keeps waiting on a slow read when the device has no copy', async () => {
    let got: any;
    http.get(`${BAR}/findBarStaffList`).subscribe((r) => (got = r));
    tick(20000);
    await flushMicrotasks();
    expect(got).toBeUndefined();
    line.expectOne(`${BAR}/findBarStaffList`).flush({ data: [] });
    expect(got.data).toEqual([]);
  });

  it('does not stand in for live reads outside selling (they wait for the server)', async () => {
    offline.recall.and.resolveTo({ data: { old: true } });
    let got: any;
    http.get(`${BAR}/cashUp/preview`).subscribe((r) => (got = r));
    tick(20000);
    await flushMicrotasks();
    expect(got).toBeUndefined();
    line.expectOne(`${BAR}/cashUp/preview`).flush({ data: { fresh: true } });
    expect(got.data.fresh).toBeTrue();
  });

  it('shows a report from the device at once, then the server answer when it lands', async () => {
    offline.instantRecall.and.resolveTo({ data: { total: 1 } });
    const got: any[] = [];
    http.get(`${BAR}/findIncomeExpenses/YESTERDAY`).subscribe((r) => got.push(r));
    await flushMicrotasks();
    expect(got.length).toBe(1);
    expect(got[0].data.total).toBe(1);

    line.expectOne(`${BAR}/findIncomeExpenses/YESTERDAY`).flush({ data: { total: 2 } });
    expect(got.length).toBe(2);
    expect(got[1].data.total).toBe(2);
    expect(offline.instantRemember).toHaveBeenCalledWith('GET', `${BAR}/findIncomeExpenses/YESTERDAY`, null, { data: { total: 2 } });
  });

  it('waits for the server the first time a report is asked for, and keeps the answer', async () => {
    let got: any;
    http.post(`${BAR}/findStaffCommissionTotals`, { page: 0, size: 0, filter: 'TODAY' }).subscribe((r) => (got = r));
    await flushMicrotasks();
    expect(got).toBeUndefined();
    line.expectOne(`${BAR}/findStaffCommissionTotals`).flush({ data: [] });
    expect(got.data).toEqual([]);
    expect(offline.instantRemember).toHaveBeenCalledWith('POST', `${BAR}/findStaffCommissionTotals`,
      { page: 0, size: 0, filter: 'TODAY' }, { data: [] });
  });

  it('keeps the device copy on screen when the refresh fails', async () => {
    offline.instantRecall.and.resolveTo({ data: { total: 1 } });
    const got: any[] = [];
    let failed = false;
    http.get(`${BAR}/findIncomeExpenses/TODAY`).subscribe({ next: (r) => got.push(r), error: () => (failed = true) });
    await flushMicrotasks();
    line.expectOne(`${BAR}/findIncomeExpenses/TODAY`).flush('down', { status: 500, statusText: 'Server Error' });
    expect(got.length).toBe(1);
    expect(failed).toBeFalse();
  });

  it('sends one request when the page and its warm-up ask for the same list together', async () => {
    const got: any[] = [];
    http.get(`${BAR}/salesOpenedList`).subscribe((r) => got.push(r));
    http.get(`${BAR}/salesOpenedList`).subscribe((r) => got.push(r));
    line.expectOne(`${BAR}/salesOpenedList`).flush({ data: [] });
    expect(got.length).toBe(2);
    // Once answered, the next ask goes out again.
    http.get(`${BAR}/salesOpenedList`).subscribe();
    line.expectOne(`${BAR}/salesOpenedList`).flush({ data: [] });
  });

  it('queues a sale that gets no answer, under the op id it was sent with', async () => {
    let got: any;
    http.post(`${BAR}/addSaleItems`, { salesOpenedUID: 'b1', items: [] }).subscribe((r) => (got = r));
    const req = line.expectOne(`${BAR}/addSaleItems`);
    expect(req.request.headers.get('X-Op-Id')).toBe('op-1');
    tick(10000);
    await flushMicrotasks();
    expect(req.cancelled).toBeTrue();
    expect(offline.queueAddItems).toHaveBeenCalledWith(`${BAR}/addSaleItems`, { salesOpenedUID: 'b1', items: [] }, 'op-1');
    expect(got.data).toEqual({ queued: true });
    expect(offline.weak()).toBeTrue();
    expect(offline.setOffline).not.toHaveBeenCalled();
  });

  it('passes a sale answered in time straight through', async () => {
    let got: any;
    http.post(`${BAR}/addSaleItems`, {}).subscribe((r) => (got = r));
    tick(9000);
    line.expectOne(`${BAR}/addSaleItems`).flush({ data: 'ok' });
    tick(5000);
    expect(got.data).toBe('ok');
    expect(offline.queueAddItems).not.toHaveBeenCalled();
  });
});
