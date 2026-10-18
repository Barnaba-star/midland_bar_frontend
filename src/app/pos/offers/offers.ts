import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { ServiceBarMethod } from '../service-bar-method';

interface Rule {
  uid?: string;
  name: string;
  kind: 'PERCENT' | 'PRICE' | 'BUY_GET';
  serviceUid?: string | null;
  category?: string | null;
  percent?: number | null;
  price?: number | null;
  buyQty?: number | null;
  freeQty?: number | null;
  days: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

/**
 * POS Setting > Ofa / Happy hour (CEO, MANAGER): the offers that price items
 * as they are sold - percent off a product or a whole category, a set price,
 * or buy N get M free on the same bill - on chosen days between two times.
 */
@Component({
  selector: 'app-offers',
  imports: [FormsModule, MatIconModule, TranslatePipe, DecimalPipe],
  templateUrl: './offers.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Offers implements OnInit {
  private barService = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);

  readonly categories = ['DRINK', 'FOOD', 'SHISHA', 'POOL', 'JUICE'];
  readonly weekdays = ['1', '2', '3', '4', '5', '6', '7'];
  rules: Rule[] = [];
  services: { uid: string; serviceName: string; price: number }[] = [];
  editing: Rule | null = null;
  busy = false;

  ngOnInit(): void {
    this.load();
    this.barService.findBarServiceList().subscribe((res: any) => {
      this.services = (res?.data ?? []).filter((s: any) => s.kind !== 'STOCK_ITEM')
        .sort((a: any, b: any) => (a.serviceName ?? '').localeCompare(b.serviceName ?? ''));
      this.cdr.markForCheck();
    });
  }

  /** The offers the server says are running right now. */
  runningNow = new Set<string>();

  load(): void {
    this.barService.findPriceRules().subscribe((res) => {
      this.rules = res?.data ?? [];
      this.cdr.markForCheck();
    });
    this.barService.findPriceRulesNow().subscribe((res) => {
      this.runningNow = new Set((res?.data ?? []).map((r: any) => r.uid));
      this.cdr.markForCheck();
    });
  }

  wholeDay(): void {
    if (!this.editing) return;
    this.editing.startTime = '00:00';
    this.editing.endTime = '23:59';
  }

  add(): void {
    // The whole day by default: a time window left at someone else's guess is
    // an offer that silently never runs.
    this.editing = { name: 'Ofa', kind: 'PERCENT', category: 'DRINK', percent: 20, days: '1234567', startTime: '00:00', endTime: '23:59', enabled: true };
  }

  edit(r: Rule): void {
    this.editing = { ...r, startTime: (r.startTime ?? '').slice(0, 5), endTime: (r.endTime ?? '').slice(0, 5) };
  }

  toggleDay(d: string): void {
    if (!this.editing) return;
    const days = this.editing.days.includes(d) ? this.editing.days.replace(d, '') : this.editing.days + d;
    this.editing.days = days.split('').sort().join('');
  }

  serviceName(uid?: string | null): string {
    return this.services.find((s) => s.uid === uid)?.serviceName ?? '';
  }

  save(): void {
    if (!this.editing || this.busy) return;
    this.busy = true;
    const r = this.editing;
    const body = { ...r, serviceUid: r.serviceUid || null, category: r.serviceUid ? null : r.category || null };
    this.barService.savePriceRule(body, r.uid).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.editing = null;
          this.load();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggle(r: Rule): void {
    this.barService.savePriceRule({ ...r, enabled: !r.enabled }, r.uid).subscribe(() => this.load());
  }

  remove(r: Rule): void {
    this.barService.deletePriceRule(r.uid!).subscribe(() => this.load());
  }
}
