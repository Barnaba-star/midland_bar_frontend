import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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

  // ---- "BaronixTZ ➜ <question>" and its answer, one pair at a time ----

  /** Each question + answer stays this long before the next pair comes. */
  readonly whatMs = 15000;
  /** Milliseconds per letter while a question writes itself out. */
  private static readonly ASK_CHAR_MS = 32;
  /** How long BaronixTZ shows "typing…" before its answer. */
  private static readonly TYPING_MS = 1100;
  readonly whats = Array.from({ length: 6 }, (_, i) => ({
    q: `LANDING.ASK${i + 1}_Q`,
    a: `LANDING.ASK${i + 1}_A`,
  }));
  whatIndex = 0;

  /** The photo behind the hero changes with each question, fading from one to the next. */
  readonly bgImages = ['pub-hall', 'bar-glow', 'pendant-bar', 'shelf', 'sunset-toast', 'bar-counter']
    .map((n) => `assets/images/bar/${n}.jpg`);
  private bgPrev = -1;

  get bgIndex(): number {
    return this.whatIndex % this.bgImages.length;
  }

  /** Only the photo showing, the one fading out and the next one are in the page - the rest load when their turn comes. */
  bgInPage(i: number): boolean {
    const n = this.bgImages.length;
    return i === this.bgIndex || i === this.bgPrev || i === (this.bgIndex + 1) % n;
  }
  /** Held while a finger or pointer is on it, so the reader can finish. */
  whatPaused = false;
  /** How much of the question is written so far; the answer comes once it is all there. */
  askTyped = '';
  askDone = false;
  /** The answer bubble, after a moment of "typing…" once the question is in. */
  answerShown = false;
  private answerTimer: ReturnType<typeof setTimeout> | null = null;
  private whatTimer: ReturnType<typeof setInterval> | null = null;
  private askTimer: ReturnType<typeof setInterval> | null = null;
  private translate = inject(TranslateService);

  get what() {
    return this.whats[this.whatIndex];
  }

  showWhat(i: number): void {
    this.bgPrev = this.bgIndex;
    this.whatIndex = (i + this.whats.length) % this.whats.length;
    this.typeQuestion();
    this.restartWhatTimer();
  }

  holdWhat(paused: boolean): void {
    this.whatPaused = paused;
    this.cdr.markForCheck();
  }

  /** The question after the arrow writes itself, letter by letter; then the answer appears. */
  private typeQuestion(): void {
    if (this.askTimer) {
      clearInterval(this.askTimer);
      this.askTimer = null;
    }
    if (this.answerTimer) {
      clearTimeout(this.answerTimer);
      this.answerTimer = null;
    }
    this.answerShown = false;
    const full = this.translate.instant(this.what.q) as string;
    const still = typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || !full || full === this.what.q) {
      this.askTyped = full;
      this.askDone = true;
      this.answerShown = true;
      this.cdr.markForCheck();
      return;
    }
    this.askTyped = '';
    this.askDone = false;
    let n = 0;
    this.askTimer = setInterval(() => {
      n++;
      this.askTyped = full.slice(0, n);
      if (n >= full.length) {
        this.askDone = true;
        clearInterval(this.askTimer!);
        this.askTimer = null;
        // BaronixTZ "types" for a moment, then answers - like a person in a chat.
        this.answerTimer = setTimeout(() => {
          this.answerShown = true;
          this.answerTimer = null;
          this.cdr.markForCheck();
        }, Landing.TYPING_MS);
      }
      this.cdr.markForCheck();
    }, Landing.ASK_CHAR_MS);
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
        this.bgPrev = this.bgIndex;
        this.whatIndex = (this.whatIndex + 1) % this.whats.length;
        this.typeQuestion();
      }
    }, this.whatMs);
  }

  ngOnDestroy(): void {
    if (this.whatTimer) {
      clearInterval(this.whatTimer);
    }
    if (this.askTimer) {
      clearInterval(this.askTimer);
    }
    if (this.answerTimer) {
      clearTimeout(this.answerTimer);
    }
    if (this.svTimer) {
      clearInterval(this.svTimer);
    }
  }

  /** The section on its own, or 'home' for the whole page. */
  view = 'home';
  private readonly views = new Set(['kuhusu', 'huduma', 'anza', 'bei', 'maswali', 'wasiliana']);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** The order a visitor walks the tabs in, "Ifuatayo →" at the foot of each. */
  private readonly tabOrder = ['kuhusu', 'huduma', 'anza', 'bei', 'maswali', 'wasiliana'];

  /** The tab after this one, with its menu title; null on the last. */
  get nextTab(): { id: string; label: string } | null {
    const i = this.tabOrder.indexOf(this.view);
    const id = i >= 0 ? this.tabOrder[i + 1] : undefined;
    const link = id ? this.navLinks.find((l) => l.id === id) : undefined;
    return link && id ? { id, label: link.label } : null;
  }

  get home(): boolean {
    return this.view === 'home';
  }

  /** Kuhusu in two steps: A (about BaronixTZ), then B (who sees what). */
  aboutStep: 'a' | 'b' = 'a';

  setAboutStep(step: 'a' | 'b'): void {
    this.aboutStep = step;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
    this.cdr.markForCheck();
  }

  /** Mwanzo is the hero alone; a tab shows only its own section (Kuhusu one step at a time). */
  show(id: string): boolean {
    if (id === 'kuhusu') {
      return this.view === 'kuhusu' && this.aboutStep === 'a';
    }
    if (id === 'watumiaji') {
      return this.view === 'kuhusu' && this.aboutStep === 'b';
    }
    return this.view === id;
  }

  ngOnInit(): void {
    // The first question waits for the words to load, then writes itself; again on a language switch.
    this.translate.stream(this.whats[0].q).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.typeQuestion());
    this.restartWhatTimer();
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((f) => {
      this.view = f && this.views.has(f) ? f : 'home';
      if (this.view === 'huduma') {
        this.showService(0, true);
      }
      this.aboutStep = 'a';
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

  // ---- Huduma tab: one service at a time, writing itself, then the next ----

  /** Each service stays this long: time to write itself out and be read. */
  readonly svMs = 18000;
  svIndex = 0;
  svPaused = false;
  /** Opening the tab: the first service is already written out, to read at once. */
  svInstant = false;
  private svTimer: ReturnType<typeof setInterval> | null = null;

  get service() {
    return this.services[this.svIndex];
  }

  /** The last service: no wrapping round - the way on is About. */
  get svLast(): boolean {
    return this.svIndex === this.services.length - 1;
  }

  showService(i: number, instant = false): void {
    this.svInstant = instant;
    this.svIndex = Math.max(0, Math.min(i, this.services.length - 1));
    this.restartSvTimer();
    this.cdr.markForCheck();
  }

  holdService(paused: boolean): void {
    this.svPaused = paused;
  }

  private restartSvTimer(): void {
    if (this.svTimer) {
      clearInterval(this.svTimer);
    }
    if (typeof window === 'undefined') {
      return;
    }
    this.svTimer = setInterval(() => {
      // Stops on the last one, where the button leads on to About.
      if (!this.svPaused && this.view === 'huduma' && !this.svLast) {
        this.svInstant = false;
        this.svIndex = this.svIndex + 1;
        this.cdr.markForCheck();
      }
    }, this.svMs);
  }

  /** What Baronix does, one card per service, each with what it really covers. */
  readonly services = [
    { icon: 'account_balance_wallet', key: 'SV1', n: 2 },
    { icon: 'point_of_sale', key: 'SV2', n: 3 },
    { icon: 'fact_check', key: 'SV3', n: 3 },
    { icon: 'inventory_2', key: 'SV4', n: 4 },
    { icon: 'groups', key: 'SV5', n: 3 },
    { icon: 'payments', key: 'SV6', n: 4 },
    { icon: 'query_stats', key: 'SV7', n: 4 },
    { icon: 'storefront', key: 'SV8', n: 4 },
  ].map((s) => ({
    icon: s.icon,
    title: `LANDING.${s.key}_T`,
    desc: `LANDING.${s.key}_D`,
    bullets: Array.from({ length: s.n }, (_, j) => `LANDING.${s.key}_B${j + 1}`),
  }));

  /** A service's points in the current language (one array per language, so the typing is not reset every check). */
  private bulletCache = new Map<string, string[]>();
  bulletTexts(i: number): string[] {
    const key = `${this.translate.currentLang}:${i}`;
    let texts = this.bulletCache.get(key);
    if (!texts) {
      texts = this.services[i].bullets.map((k) => this.translate.instant(k) as string);
      if (texts.some((t, j) => t === this.services[i].bullets[j])) {
        return texts; // still loading: keys, not words - try again next check
      }
      this.bulletCache.set(key, texts);
    }
    return texts;
  }


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
