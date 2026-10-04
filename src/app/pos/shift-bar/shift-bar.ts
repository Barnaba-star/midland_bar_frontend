import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../Utils/enviroments/environment';
import { Response } from '../../Utils/models/responces';
import { AlertService } from '../../Utils/services/alert';
import { OfflineService } from '../../Utils/offline/offline.service';

export type ShiftState = 'NONE' | 'OPEN' | 'CLOSED';

/**
 * The signed-in seller's shift: open one to start selling, close it to stop.
 * A closed shift waits for its cash-up before a new one can be opened (the
 * backend holds all of this - selling without an open shift is refused).
 */
@Component({
  selector: 'app-shift-bar',
  imports: [MatIconModule, DatePipe, TranslatePipe],
  templateUrl: './shift-bar.html',
  styleUrl: './shift-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftBar implements OnInit {
  @Input() area = 'bar';
  /** Off on the Cash-up tab itself, where the count is right below. */
  @Input() showCashUpLink = true;
  /**
   * Staff Sell: the waiters work on the cashier's login, so they are told the
   * shift isn't open but get no buttons, and nothing shows while it is open.
   */
  @Input() noticeOnly = false;
  /** A staff member signed in on their own: the shift is the branch's (any cashier's), not this device's. */
  @Input() branchWide = false;
  @Output() stateChange = new EventEmitter<ShiftState>();

  state: ShiftState | null = null;
  openedAt: string | null = null;
  /** CEO/manager only: other people's shifts open in the branch right now. */
  others: { cashierName: string; openedAt: string }[] = [];
  busy = false;
  confirmingClose = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private alert: AlertService,
    private translate: TranslateService,
  ) {}

  private get url(): string {
    return `${environment.baseApiUrl}/${this.area}/shift`;
  }

  ngOnInit(): void {
    this.load();
    // Queued shift changes have reached the server: read its answer again.
    this.offline.synced.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  private offline = inject(OfflineService);
  private destroyRef = inject(DestroyRef);

  load(): void {
    this.http.get<Response<any>>(`${this.url}/current`).subscribe({
      next: (res) => {
        this.others = res?.data?.others ?? [];
        this.apply(res?.data?.state ?? 'NONE', res?.data?.shift?.openedAt ?? null);
      },
    });
  }

  open(): void {
    this.busy = true;
    this.http.post<Response<any>>(`${this.url}/open`, {}).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('SHIFT.OPENED_OK'));
          this.apply('OPEN', res.data.openedAt);
        } else {
          this.load();
        }
      },
      error: () => this.done(),
    });
  }

  close(): void {
    if (!this.confirmingClose) {
      this.confirmingClose = true;
      return;
    }
    this.confirmingClose = false;
    this.busy = true;
    this.http.post<Response<any>>(`${this.url}/close`, {}).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('SHIFT.CLOSED_OK'));
          this.apply('CLOSED', res.data.openedAt);
        } else {
          this.load();
        }
      },
      error: () => this.done(),
    });
  }

  goToCashUp(): void {
    this.router.navigate(['/pos/barReports'], { queryParams: { tab: 'REPORTS.CASHUP' } });
  }

  private apply(state: ShiftState, openedAt: string | null): void {
    this.state = state;
    this.openedAt = openedAt;
    this.stateChange.emit(state);
    this.cdr.markForCheck();
  }

  private done(): void {
    this.busy = false;
    this.cdr.markForCheck();
  }
}
