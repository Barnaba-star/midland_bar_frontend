import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LoyaltyProgress } from '../../../pos/BarModel';

/** "Bills paid this month: 2 of 4 - 2 waiting for payment" for the customer on a bill. */
@Component({
  selector: 'app-loyalty-progress',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (p && p.enabled && p.needed > 0) {
      <div class="lp">
        <mat-icon>event_repeat</mat-icon>
        <div>
          @if (p.visits >= p.needed) {
            <span>{{ 'CUSTOMER_PIN.PROGRESS_DONE' | translate: { needed: p.needed } }}</span>
          } @else {
            <span>{{ 'CUSTOMER_PIN.PROGRESS' | translate: { visits: p.visits, needed: p.needed, left: p.needed - p.visits } }}</span>
          }
          @if (p.waiting) {
            <small>{{ 'CUSTOMER_PIN.PROGRESS_WAITING' | translate: { waiting: p.waiting } }}</small>
          }
          <span class="lp-dots">
            @for (i of dots; track i) {
              <i [class.on]="i < p.visits"></i>
            }
          </span>
        </div>
      </div>
    }
  `,
  styles: [`
    .lp { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px;
      background: var(--color-surface); border: 1px dashed color-mix(in srgb, var(--color-text) 25%, transparent);
      color: var(--color-text); font-size: 13px; line-height: 1.4; text-align: left; }
    .lp mat-icon { flex: 0 0 auto; color: #d97706; }
    .lp div { display: flex; flex-direction: column; gap: 4px; }
    .lp small { opacity: .75; }
    .lp-dots { display: flex; gap: 5px; }
    .lp-dots i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #d97706; }
    .lp-dots i.on { background: #d97706; }
  `],
})
export class LoyaltyProgressComponent {
  @Input() p: LoyaltyProgress | null | undefined = null;
  get dots(): number[] {
    return Array.from({ length: Math.min(this.p?.needed ?? 0, 12) }, (_, i) => i);
  }
}
