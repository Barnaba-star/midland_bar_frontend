import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';

interface Winner { customerUid: string; name: string; phone?: string; earned: number; used: number; left: number; expiresAt?: string }

/** Customers who met the loyalty rule and hold an offer: name, what is left to spend, till when. */
@Component({
  selector: 'app-loyalty-winners',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lw">
      <div class="lw-head">
        <span class="lw-icon"><mat-icon>emoji_events</mat-icon></span>
        <div class="lw-title">
          <h3>{{ 'LOYALTY.WINNERS_TITLE' | translate }}</h3>
          <p>{{ 'LOYALTY.WINNERS_SUB' | translate }}</p>
        </div>
        <div class="lw-stats">
          <div><b>{{ withOffer }}</b><span>{{ 'LOYALTY.WINNERS_COUNT' | translate }}</span></div>
          <div><b>{{ totalLeft | number }}</b><span>{{ 'LOYALTY.WINNERS_LEFT' | translate }}</span></div>
        </div>
      </div>
      @if (loading) {
        <p class="lw-empty">…</p>
      } @else if (!rows.length) {
        <p class="lw-empty">{{ 'LOYALTY.WINNERS_NONE' | translate }}</p>
      } @else {
        <div class="lw-list">
          @for (w of rows; track w.customerUid) {
            <div class="lw-row" [class.done]="w.left <= 0">
              <div class="lw-who">
                <b>{{ w.name }}</b>
                @if (w.phone) { <small>{{ w.phone }}</small> }
              </div>
              <div class="lw-amt">
                @if (w.left > 0) {
                  <b>{{ w.left | number }}</b>
                  <small>{{ 'LOYALTY.WINNERS_OF' | translate: { earned: (w.earned | number) } }}@if (w.expiresAt) { · {{ 'LOYALTY.WINNERS_UNTIL' | translate: { date: (w.expiresAt | date: 'd/M') } }} }</small>
                } @else {
                  <span class="lw-used">{{ 'LOYALTY.WINNERS_USED' | translate }}</span>
                  <small>{{ w.earned | number }}</small>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; width: 100%; }
    .lw, .lw * { box-sizing: border-box; }
    .lw { margin-bottom: 14px; padding: 16px; border: 1px solid var(--color-border, #e8dcc8); border-radius: 14px;
      background: var(--color-surface, #fff); color: var(--color-text, #1d1812); text-align: left; }
    .lw-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .lw-icon { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 40px; height: 40px;
      border-radius: 10px; background: color-mix(in srgb, #0f766e 15%, transparent); color: #0f766e; }
    .lw-title { flex: 1 1 200px; min-width: 0; }
    .lw-title h3 { margin: 0; font-size: 18px; }
    .lw-title p { margin: 2px 0 0; font-size: 13px; color: var(--color-text-muted, #7a6f60); }
    .lw-stats { display: flex; gap: 10px; }
    .lw-stats div { display: flex; flex-direction: column; align-items: center; padding: 6px 12px; border-radius: 10px;
      background: color-mix(in srgb, #0f766e 10%, transparent); }
    .lw-stats b { font-size: 16px; color: #0f766e; }
    .lw-stats span { font-size: 11px; color: var(--color-text-muted, #7a6f60); }
    .lw-empty { margin: 12px 0 0; font-size: 13px; color: var(--color-text-muted, #7a6f60); }
    .lw-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .lw-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px;
      border-radius: 10px; border: 1px solid color-mix(in srgb, #0f766e 35%, transparent);
      background: color-mix(in srgb, #0f766e 6%, transparent); }
    .lw-row.done { opacity: .6; border-color: var(--color-border, #e8dcc8); background: transparent; }
    .lw-who, .lw-amt { display: flex; flex-direction: column; min-width: 0; }
    .lw-amt { align-items: flex-end; text-align: right; }
    .lw-amt b { font-size: 15px; color: #0f766e; }
    .lw-row small { font-size: 12px; color: var(--color-text-muted, #7a6f60); }
    .lw-used { font-size: 12px; font-weight: 700; }
  `],
})
export class LoyaltyWinnersCard implements OnInit {
  private bar = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);
  rows: Winner[] = [];
  withOffer = 0;
  totalLeft = 0;
  loading = true;

  ngOnInit(): void {
    this.bar.loyaltyWinners().subscribe({
      next: (res) => {
        this.rows = res?.data?.customers ?? [];
        this.withOffer = res?.data?.withOffer ?? 0;
        this.totalLeft = res?.data?.totalLeft ?? 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
