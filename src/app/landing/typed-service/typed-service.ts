import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, computed, effect, inject, input, signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** One run of words, with where it starts in the service's word count. */
interface Line {
  words: string[];
  from: number;
}

/**
 * One Baronix service, written out word by word once it scrolls into view:
 * the name, then what it is, then each thing it does - every word after the
 * one before it. The full text is in the page from the start (screen readers
 * and search read it all); only its showing is animated. Someone who asked
 * their device for less motion gets it all at once.
 */
@Component({
  selector: 'app-typed-service',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ts-head">
      <span class="ts-no">{{ no() }}</span>
      <span class="ts-icon"><mat-icon>{{ icon() }}</mat-icon></span>
      <h3>
        @if (typing() && shown() === 0) { <i class="caret"></i> }
        @for (w of titleLine().words; track $index) {
          <span class="w" [class.on]="titleLine().from + $index < shown()">{{ w }} </span>
          @if (typing() && titleLine().from + $index === shown() - 1) { <i class="caret"></i> }
        }
      </h3>
    </div>
    <p class="ts-desc">
      @for (w of descLine().words; track $index) {
        <span class="w" [class.on]="descLine().from + $index < shown()">{{ w }} </span>
        @if (typing() && descLine().from + $index === shown() - 1) { <i class="caret"></i> }
      }
    </p>
    <ul>
      @for (b of bulletLines(); track $index) {
        <li [class.on]="b.from < shown()">
          <mat-icon>check</mat-icon>
          <span>
            @for (w of b.words; track $index) {
              <span class="w" [class.on]="b.from + $index < shown()">{{ w }} </span>
              @if (typing() && b.from + $index === shown() - 1) { <i class="caret"></i> }
            }
          </span>
        </li>
      }
    </ul>
  `,

  styleUrl: './typed-service.css',
})
export class TypedService implements OnInit {
  readonly no = input.required<string>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly desc = input.required<string>();
  readonly bullets = input.required<string[]>();

  /** Milliseconds between words: quick enough to read along, slow enough to see it write. */
  private static readonly WORD_MS = 55;

  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setInterval> | null = null;

  /** How many words are showing so far. */
  readonly shown = signal(0);
  /** Scrolled into view (or nothing to animate on this device). */
  private readonly visible = signal(false);

  private readonly lines = computed<Line[]>(() => {
    const texts = [this.title(), this.desc(), ...this.bullets()];
    let from = 0;
    return texts.map((t) => {
      const words = String(t ?? '').split(/\s+/).filter(Boolean);
      const line = { words, from };
      from += words.length;
      return line;
    });
  });

  readonly titleLine = computed(() => this.lines()[0]);
  readonly descLine = computed(() => this.lines()[1]);
  readonly bulletLines = computed(() => this.lines().slice(2));
  private readonly total = computed(() => this.lines().reduce((n, l) => n + l.words.length, 0));
  /** The translations are in - until then the inputs are still keys like LANDING.SV1_T. */
  private readonly ready = computed(() => !String(this.title() ?? '').startsWith('LANDING.'));

  /** Still writing: the caret follows the last word written. */
  readonly typing = computed(() => this.visible() && this.ready() && this.shown() < this.total());

  constructor() {
    // In view and translated: write on from wherever it got to (new words after
    // a language switch are written on too, not dropped in all at once).
    effect(() => {
      if (this.visible() && this.ready() && this.shown() < this.total() && !this.timer) {
        this.timer = setInterval(() => {
          const next = this.shown() + 1;
          this.shown.set(next);
          if (next >= this.total()) {
            this.stop();
          }
        }, TypedService.WORD_MS);
      }
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  ngOnInit(): void {
    const still = typeof window === 'undefined'
      || typeof IntersectionObserver === 'undefined'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      this.shown.set(Number.MAX_SAFE_INTEGER);
      this.visible.set(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        this.visible.set(true);
      }
    }, { threshold: 0.25 });
    io.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => io.disconnect());
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
