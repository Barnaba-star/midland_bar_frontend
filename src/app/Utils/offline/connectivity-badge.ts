import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineService } from './offline.service';

/**
 * Online / offline in the header, with how much work is waiting to reach
 * the server. Opens to the list of what is waiting and what the server
 * turned down (and why), with "Send now".
 */
@Component({
  selector: 'app-connectivity-badge',
  imports: [MatIconModule, MatTooltipModule, DatePipe, DecimalPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (offline.browser) {
      <div class="cb-wrap">
        <button type="button" class="cb" (click)="open.set(!open())"
                [class.off]="!offline.online()" [class.busy]="offline.syncing()" [class.warn]="offline.failed().length"
                [matTooltip]="(offline.online() ? 'OFFLINE.ONLINE' : 'OFFLINE.OFFLINE') | translate">
          <i class="cb-dot"></i>
          <span class="cb-label">{{ (offline.online() ? 'OFFLINE.ONLINE' : 'OFFLINE.OFFLINE') | translate }}</span>
          @if (offline.pending().length) {
            <span class="cb-count">{{ offline.pending().length }}</span>
          }
          @if (offline.failed().length) {
            <mat-icon class="cb-alert">error</mat-icon>
          }
        </button>

        @if (open()) {
          <div class="cb-panel">
            <div class="cb-head">
              <strong>{{ (offline.online() ? 'OFFLINE.ONLINE' : 'OFFLINE.OFFLINE') | translate }}</strong>
              <span>{{ (offline.online() ? 'OFFLINE.ONLINE_TEXT' : 'OFFLINE.OFFLINE_TEXT') | translate }}</span>
            </div>

            <div class="cb-sec">
              <span class="cb-sec-title">{{ 'OFFLINE.PENDING' | translate: { n: offline.pending().length } }}</span>
              @for (op of offline.pending(); track op.id) {
                <div class="cb-row">
                  <span>{{ 'OFFLINE.KIND_' + op.kind | translate }} {{ label(op) }}</span>
                  <small>{{ op.at | date: 'HH:mm' }}</small>
                </div>
              } @empty {
                <p class="cb-none">{{ 'OFFLINE.NOTHING_PENDING' | translate }}</p>
              }
              @if (offline.othersPending()) {
                <p class="cb-none">{{ 'OFFLINE.OTHERS_PENDING' | translate: { n: offline.othersPending() } }}</p>
              }
            </div>

            @if (offline.failed().length) {
              <div class="cb-sec">
                <span class="cb-sec-title warn">{{ 'OFFLINE.FAILED' | translate: { n: offline.failed().length } }}</span>
                @for (f of offline.failed(); track f.id) {
                  <div class="cb-row failed">
                    <div>
                      <span>{{ 'OFFLINE.KIND_' + f.kind | translate }} {{ label(f) }}</span>
                      <small class="cb-reason">{{ f.message }}</small>
                    </div>
                    <button type="button" class="cb-x" (click)="offline.dismissFailed(f.id)" [matTooltip]="'OFFLINE.DISMISS' | translate">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }

            <button type="button" class="cb-send" [disabled]="!offline.pending().length || offline.syncing()" (click)="sendNow()">
              <mat-icon>sync</mat-icon>{{ (offline.syncing() ? 'OFFLINE.SENDING' : 'OFFLINE.SEND_NOW') | translate }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cb-wrap { position: relative; }
    .cb {
      --tone: #2e9e5b;
      display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent); border-radius: 999px;
      background: color-mix(in srgb, var(--tone) 10%, transparent); color: var(--color-text);
      font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .cb.off { --tone: #c0392b; }
    .cb.busy { --tone: #3b82f6; }
    .cb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tone); }
    .cb.busy .cb-dot { animation: cb-pulse 1s ease-in-out infinite; }
    @keyframes cb-pulse { 50% { opacity: 0.3; } }
    @media (prefers-reduced-motion: reduce) { .cb.busy .cb-dot { animation: none; } }
    .cb-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--tone); color: #fff; display: grid; place-items: center; font-size: 11px; }
    .cb-alert { width: 16px; height: 16px; font-size: 16px; color: #c0392b; }
    @media (max-width: 600px) { .cb-label { display: none; } }
    .cb-panel {
      position: absolute; top: calc(100% + 8px); left: 0; z-index: 1000; width: min(320px, 90vw);
      display: flex; flex-direction: column; gap: 12px; padding: 14px;
      background: var(--color-surface); color: var(--color-text);
      border: 1px solid var(--color-border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md);
    }
    .cb-head { display: flex; flex-direction: column; gap: 2px; }
    .cb-head span, .cb-none, .cb-row small { color: var(--color-text-muted); font-size: 12px; }
    .cb-none { margin: 0; }
    .cb-sec { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
    .cb-sec-title { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-muted); }
    .cb-sec-title.warn { color: #c0392b; }
    .cb-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
    .cb-row.failed > div { display: flex; flex-direction: column; }
    .cb-reason { color: #c0392b !important; }
    .cb-x { border: none; background: transparent; color: var(--color-text-muted); cursor: pointer; display: grid; place-items: center; }
    .cb-x mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .cb-send {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px;
      border: none; border-radius: 8px; background: var(--color-accent); color: #1d1812; font-weight: 700; cursor: pointer;
    }
    .cb-send mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .cb-send:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ConnectivityBadge {
  readonly offline = inject(OfflineService);
  readonly open = signal(false);

  label(op: any): string {
    return op.meta?.bill?.salesCode ?? op.meta?.salesCode ?? op.meta?.staffName ?? (op.meta?.total ? `· ${op.meta.total.toLocaleString()}` : '');
  }

  sendNow(): void {
    this.offline.checkConnection().then(() => this.offline.sync());
  }
}
