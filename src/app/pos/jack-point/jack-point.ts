import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { AlertService } from '../../Utils/services/alert';
import { localDate } from '../../Utils/services/local-date';
import { JackPeriod, JackPoint, JackPointAward, JackPointGame, JackPointProgress } from '../BarModel';

type Filter = 'RUNNING' | 'UPCOMING' | 'OFF' | 'ALL';

/**
 * Jack Point: the waiters' game (CEO, manager, accountant). A staff member
 * whose commission reaches the weekly target for so many weeks in a row wins
 * paid days off, a bonus and/or a written reward. The system finds the
 * winners once each week is over; here they are approved or turned down.
 */
@Component({
  selector: 'app-jack-point',
  imports: [FormsModule, MatIconModule, TranslatePipe, DecimalPipe, DatePipe],
  templateUrl: './jack-point.html',
  styleUrls: ['../debts/debts.css', './jack-point.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JackPointPage implements OnInit {
  private barService = inject(ServiceBarMethod);
  private cdr = inject(ChangeDetectorRef);
  private alert = inject(AlertService);
  private translate = inject(TranslateService);

  games: JackPointGame[] = [];
  readonly periods: JackPeriod[] = ['DAY', 'WEEK', 'MONTH'];
  readonly filters: Filter[] = ['RUNNING', 'UPCOMING', 'OFF', 'ALL'];
  /** Which games the list and the cards show. */
  filter: Filter = 'RUNNING';
  awards: JackPointAward[] = [];
  /** Who had a bonus put onto their commission, and how much in all. */
  bonuses: JackPointAward[] = [];
  bonusTotal = 0;
  loading = true;
  busy = false;
  editing: JackPoint | null = null;
  deleting: string | null = null;
  /** The win being decided, and how. */
  deciding: { uid: string; approve: boolean; leaveFrom: string; note: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  get waiting(): JackPointAward[] {
    return this.awards.filter((a) => a.status === 'QUALIFIED');
  }

  get decided(): JackPointAward[] {
    return this.awards.filter((a) => a.status !== 'QUALIFIED');
  }

  load(): void {
    this.barService.jackPoints().subscribe({
      next: (res) => {
        this.games = res?.data?.jackPoints ?? [];
        // Nothing running yet: show them all rather than an empty list.
        if (this.filter === 'RUNNING' && !this.games.some((g) => this.stateOf(g) === 'RUNNING')) {
          this.filter = 'ALL';
        }
        this.awards = res?.data?.awards ?? [];
        this.bonuses = res?.data?.bonuses ?? [];
        this.bonusTotal = res?.data?.bonusTotal ?? 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  add(): void {
    this.editing = { name: '', period: 'WEEK', weeklyTarget: 50000, weeks: 4, startDate: localDate(new Date()), leaveDays: 0, bonusAmount: 20000, rewardNote: '', enabled: true, autoBonus: true, description: '' };
  }

  edit(jp: JackPoint): void {
    this.editing = { ...jp, period: this.periodOf(jp), autoBonus: !!jp.autoBonus, description: jp.description ?? '' };
  }

  periodOf(x: { period?: JackPeriod | null } | null | undefined): JackPeriod {
    return x?.period === 'DAY' || x?.period === 'MONTH' ? x.period : 'WEEK';
  }

  stateOf(g: JackPointGame): 'RUNNING' | 'UPCOMING' | 'OFF' {
    if (g.state) {
      return g.state;
    }
    if (!g.jackPoint.enabled) {
      return 'OFF';
    }
    return g.jackPoint.startDate > localDate(new Date()) ? 'UPCOMING' : 'RUNNING';
  }

  count(f: Filter): number {
    return f === 'ALL' ? this.games.length : this.games.filter((g) => this.stateOf(g) === f).length;
  }

  get shown(): JackPointGame[] {
    return this.filter === 'ALL' ? this.games : this.games.filter((g) => this.stateOf(g) === this.filter);
  }

  /** Most rounds in a row a game may ask for. */
  maxRounds(p: JackPeriod): number {
    return p === 'DAY' ? 90 : p === 'MONTH' ? 12 : 52;
  }

  /** Last day of a run: the backend sends it; older answers fall back to Sunday of its last week. */
  runEnd(a: JackPointAward): string {
    return a.runEnd ?? this.weekEnd(a.weekTo);
  }

  save(): void {
    if (!this.editing || this.busy) {
      return;
    }
    this.busy = true;
    this.barService.saveJackPoint(this.editing).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant('JACK_POINT.SAVED'));
          this.editing = null;
          this.load();
        } else if (res?.message) {
          this.alert.show('error', res.message);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }

  remove(uid: string): void {
    this.barService.deleteJackPoint(uid).subscribe(() => {
      this.deleting = null;
      this.load();
    });
  }

  startDecision(a: JackPointAward, approve: boolean): void {
    this.deciding = { uid: a.uid, approve, leaveFrom: localDate(new Date()), note: '' };
  }

  decide(a: JackPointAward): void {
    const d = this.deciding;
    if (!d || this.busy) {
      return;
    }
    this.busy = true;
    this.barService.decideJackPointAward(a.uid, {
      approve: d.approve,
      leaveFrom: d.approve && (a.leaveDays ?? 0) > 0 ? d.leaveFrom : null,
      note: d.note.trim(),
    }).subscribe({
      next: (res) => {
        this.busy = false;
        if (res?.data) {
          this.alert.show('success', this.translate.instant(d.approve ? 'JACK_POINT.APPROVED_MSG' : 'JACK_POINT.REJECTED_MSG', { name: a.staffName }));
          this.deciding = null;
          this.load();
        } else if (res?.message) {
          this.alert.show('error', res.message);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.busy = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** The weeks of a run as dots: done ones lit. */
  dots(p: JackPointProgress): boolean[] {
    return Array.from({ length: p.weeks }, (_, i) => i < p.streak);
  }

  percent(p: JackPointProgress): number {
    return Math.min(100, Math.round((p.thisWeek / Math.max(1, p.weeklyTarget)) * 100));
  }

  /** The last day off: first day + days - 1. */
  leaveTo(a: JackPointAward): string | null {
    if (!a.leaveFrom || !a.leaveDays) {
      return null;
    }
    const d = new Date(a.leaveFrom + 'T00:00:00');
    d.setDate(d.getDate() + a.leaveDays - 1);
    return localDate(d);
  }

  /** Sunday of a run's last week. */
  weekEnd(monday: string): string {
    const d = new Date(monday + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    return localDate(d);
  }
}
