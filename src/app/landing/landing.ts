import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TypedService } from './typed-service/typed-service';

@Component({
  selector: 'app-landing',
  imports: [MatIconModule, TranslatePipe, RouterLink, TypedService],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  /** The phone menu, folded away until tapped. */
  menuOpen = false;
  readonly contactEmail = 'barnabachristopher@gmail.com';
  readonly contactHref = `mailto:${this.contactEmail}?subject=${encodeURIComponent('Baronix')}`;

  /**
   * The top menu works like tabs: a title shows its section alone
   * (/#huduma shows only the services); Mwanzo shows the whole page.
   * The title rides in the URL, so the phone's back button steps back.
   */
  readonly navLinks: { id: string | null; label: string }[] = [
    { id: null, label: 'LANDING.NAV_HOME' },
    { id: 'kuhusu', label: 'LANDING.NAV_ABOUT' },
    { id: 'huduma', label: 'LANDING.NAV_SERVICES' },
    { id: 'anza', label: 'LANDING.NAV_START' },
    { id: 'bei', label: 'LANDING.NAV_PRICE' },
    { id: 'maswali', label: 'LANDING.NAV_FAQ' },
    { id: 'wasiliana', label: 'LANDING.NAV_CONTACT' },
  ];

  // ---- "BaronixTZ ➜ ..." - what it is, one answer at a time ----

  /** Each answer stays this long before the next one comes. */
  readonly whatMs = 6000;
  readonly whats = [
    'shield_person', 'storefront', 'nightlight', 'visibility', 'inventory_2',
    'account_balance_wallet', 'insights', 'fact_check', 'badge', 'emoji_events',
  ].map((icon, i) => ({ icon, title: `LANDING.WHAT${i + 1}_T`, desc: `LANDING.WHAT${i + 1}_D` }));
  whatIndex = 0;
  /** Held while a finger or pointer is on it, so the reader can finish. */
  whatPaused = false;
  private whatTimer: ReturnType<typeof setInterval> | null = null;

  get what() {
    return this.whats[this.whatIndex];
  }

  showWhat(i: number): void {
    this.whatIndex = (i + this.whats.length) % this.whats.length;
    this.restartWhatTimer();
    this.cdr.markForCheck();
  }

  holdWhat(paused: boolean): void {
    this.whatPaused = paused;
    this.cdr.markForCheck();
  }

  private restartWhatTimer(): void {
    if (this.whatTimer) {
      clearInterval(this.whatTimer);
    }
    if (typeof window === 'undefined') {
      return;
    }
    this.whatTimer = setInterval(() => {
      if (!this.whatPaused && this.home) {
        this.whatIndex = (this.whatIndex + 1) % this.whats.length;
        this.cdr.markForCheck();
      }
    }, this.whatMs);
  }

  ngOnDestroy(): void {
    if (this.whatTimer) {
      clearInterval(this.whatTimer);
    }
  }

  /** The section on its own, or 'home' for the whole page. */
  view = 'home';
  private readonly views = new Set(['kuhusu', 'huduma', 'anza', 'bei', 'maswali', 'wasiliana']);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  get home(): boolean {
    return this.view === 'home';
  }

  /** Mwanzo is the hero alone; a tab shows only its own section (who-sees-what goes with About). */
  show(id: string): boolean {
    return this.view === id || (id === 'watumiaji' && this.view === 'kuhusu');
  }

  ngOnInit(): void {
    this.restartWhatTimer();
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((f) => {
      this.view = f && this.views.has(f) ? f : 'home';
      this.menuOpen = false;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0 });
      }
      this.cdr.markForCheck();
    });
  }

  readonly aboutPoints = [
    { icon: 'travel_explore', title: 'LANDING.ABOUT_P1_T', desc: 'LANDING.ABOUT_P1_D' },
    { icon: 'sports_bar', title: 'LANDING.ABOUT_P2_T', desc: 'LANDING.ABOUT_P2_D' },
    { icon: 'storefront', title: 'LANDING.ABOUT_P3_T', desc: 'LANDING.ABOUT_P3_D' },
  ];

  /** What Baronix does, one card per service, each with what it really covers. */
  readonly services = [
    { icon: 'account_balance_wallet', key: 'SV1' },
    { icon: 'point_of_sale', key: 'SV2' },
    { icon: 'fact_check', key: 'SV3' },
    { icon: 'inventory_2', key: 'SV4' },
    { icon: 'groups', key: 'SV5' },
    { icon: 'payments', key: 'SV6' },
    { icon: 'query_stats', key: 'SV7' },
    { icon: 'storefront', key: 'SV8' },
  ].map((s) => ({
    icon: s.icon,
    title: `LANDING.${s.key}_T`,
    desc: `LANDING.${s.key}_D`,
    bullets: [1, 2, 3, 4].map((n) => `LANDING.${s.key}_B${n}`),
  }));


  readonly startSteps = [
    { no: '1', icon: 'mail', title: 'LANDING.S1_T', desc: 'LANDING.S1_D' },
    { no: '2', icon: 'tune', title: 'LANDING.S2_T', desc: 'LANDING.S2_D' },
    { no: '3', icon: 'badge', title: 'LANDING.S3_T', desc: 'LANDING.S3_D' },
    { no: '4', icon: 'insights', title: 'LANDING.S4_T', desc: 'LANDING.S4_D' },
  ];

  readonly roles = [
    { icon: 'workspace_premium', title: 'LANDING.R_OWNER_T', desc: 'LANDING.R_OWNER_D' },
    { icon: 'manage_accounts', title: 'LANDING.R_MANAGER_T', desc: 'LANDING.R_MANAGER_D' },
    { icon: 'point_of_sale', title: 'LANDING.R_CASHIER_T', desc: 'LANDING.R_CASHIER_D' },
    { icon: 'fact_check', title: 'LANDING.R_SUPERVISOR_T', desc: 'LANDING.R_SUPERVISOR_D' },
    { icon: 'room_service', title: 'LANDING.R_WAITER_T', desc: 'LANDING.R_WAITER_D' },
  ];

  readonly priceIncludes = ['LANDING.PRICE_INC1', 'LANDING.PRICE_INC2', 'LANDING.PRICE_INC3', 'LANDING.PRICE_INC4'];

  readonly faqs = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ q: `LANDING.Q${n}`, a: `LANDING.A${n}` }));





  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['login']);
  }
}
