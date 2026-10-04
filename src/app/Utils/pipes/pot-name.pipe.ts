import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * A pot's name in the language on screen. The eleven buckets are stored in
 * English ("Staff", "Stock Purchase"); an Other item is "Other · " plus either
 * an i18n key (OTHER_SPLIT.S_SALARY, picked from the list) or a name the CEO
 * typed, which shows as typed. Impure so it follows an EN/SW switch.
 */
@Pipe({ name: 'potName', pure: false })
export class PotNamePipe implements PipeTransform {
  private static readonly BUCKETS: Record<string, string> = {
    Staff: 'COMMISSION_BREAKDOWN.STAFF',
    Owner: 'COMMISSION_BREAKDOWN.OWNER',
    TRA: 'COMMISSION_BREAKDOWN.TRA',
    Emergency: 'COMMISSION_BREAKDOWN.EMERGENCY',
    Maintenance: 'COMMISSION_BREAKDOWN.MAINTENANCE',
    Other: 'COMMISSION_BREAKDOWN.OTHERS',
    LUKU: 'COMMISSION_BREAKDOWN.LUKU',
    Water: 'COMMISSION_BREAKDOWN.WATER',
    Rent: 'COMMISSION_BREAKDOWN.RENT',
    Loan: 'COMMISSION_BREAKDOWN.LOAN',
    'Stock Purchase': 'COMMISSION_BREAKDOWN.STOCK_PURCHASE',
    // Not a pot: a staff member's handover shortage, shown among a shift's payouts.
    'Staff shortage': 'STAFF_LOSS.POT',
  };

  constructor(private translate: TranslateService) {}

  /** mode "item" drops the "Other · " part - for lists that are only Other. */
  transform(name: string | null | undefined, mode: 'full' | 'item' = 'full'): string {
    const n = String(name ?? '');
    if (n.startsWith('Other · ')) {
      const item = this.translate.instant(n.slice('Other · '.length));
      return mode === 'item' ? item : `${this.translate.instant('COMMISSION_BREAKDOWN.OTHERS')} · ${item}`;
    }
    const key = PotNamePipe.BUCKETS[n];
    return key ? this.translate.instant(key) : n;
  }
}
