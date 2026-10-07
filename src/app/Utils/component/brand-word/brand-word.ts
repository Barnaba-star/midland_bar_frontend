import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The BaronixTZ logo, which is the word itself - the same as the Android
 * app's: a big crowned B, then "aronix" and an amber "TZ" level with the
 * middle of the B. The T is drawn, not typed: a heavy bar that runs on over
 * the Z to end with it, on a straight stem of the same weight. The x's "/"
 * stroke is long, rising far above the letter and running down below the
 * line, thinning to a point at each end; the r's arm runs on over the o
 * to a point by the n.
 *
 * The B takes the colour of the text around it, the crown stays amber; it
 * sizes with the font. With [mark]="true" only the crowned B is drawn, at
 * cap height - for headers that show a page title beside it.
 *
 * Measurements are Poppins ExtraBold's (the logo always uses it), in em:
 * an inline box's content area starts 1.05em above the baseline (the
 * font's ascent) and capitals are 0.709em tall.
 */
@Component({
  selector: 'app-brand-word',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', 'aria-label': 'BaronixTZ', '[class.bw-mark]': 'mark()' },
  template: `
    <svg class="bw-b" viewBox="18 5 30 48" aria-hidden="true">
      <path d="M22 15.5 20.6 9l4.9 3.4L32 6.5l6.5 5.9L43.4 9 42 15.5z" fill="#f5a524"/>
      <path fill="currentColor" fill-rule="evenodd"
            d="M19 19h15.5c6.4 0 10.5 3.4 10.5 8.6 0 3.2-1.6 5.6-4.3 6.9 3.7 1.2 5.8 4 5.8 7.8 0 6-4.6 9.7-11.6 9.7H19zm8 6.6v6.5h6.8c2.4 0 3.8-1.2 3.8-3.2s-1.4-3.3-3.8-3.3zm0 12.4v7.4h7.8c2.7 0 4.3-1.4 4.3-3.7s-1.6-3.7-4.3-3.7z"/>
    </svg>@if (!mark()) {<span class="bw-rest" aria-hidden="true"><span class="bw-line">a<span class="bw-r">r<svg class="bw-rs" viewBox="425 -705 795 353"><path d="M430 -566C520 -640 750 -700 900 -700C1050 -700 1150 -660 1215 -600C1130 -625 1030 -640 900 -640C750 -640 560 -610 480 -500C455 -460 438 -400 430 -357Z"/></svg></span>oni<span class="bw-x">x<svg class="bw-xs" viewBox="-275 -1011 1110 1561"><path d="M10 0L-268.6 550L225 0L619 -561L827.4 -1011L404 -561Z"/></svg></span><span class="bw-tz"><i class="bw-bar"></i><span class="bw-t">T<i class="bw-stem"></i></span><em>Z</em></span></span></span>}
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      line-height: 1;
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
    }
    /* The crowned B stands well above the letters... */
    .bw-b {
      height: 1.8em;
      width: auto;
      flex-shrink: 0;
      margin-right: 0.02em;
    }
    /* ...and the words are centred on the B itself, not the B plus crown. */
    .bw-rest {
      padding-top: 0.49em;
    }
    .bw-line, .bw-tz, .bw-t, .bw-x, .bw-r {
      position: relative;
    }
    em {
      font-style: normal;
      color: #f5a524;
    }
    /* The typed T only keeps its place; the drawn one goes on top. */
    .bw-t {
      color: transparent;
    }
    .bw-bar {
      position: absolute;
      top: 0.341em;
      left: 0.017em;
      right: 0.05em;
      height: 0.2em;
      border-radius: 0.015em;
      background: #f5a524;
    }
    /* A straight stem, the bar's weight, down to the line. */
    .bw-stem {
      position: absolute;
      top: 0.441em;
      left: calc(50% - 0.1em);
      width: 0.2em;
      height: 0.609em;
      background: #f5a524;
    }
    /* Room after the r (for its longer arm) and after the x (so its long
       stroke clears the T). */
    .bw-r {
      margin-right: 0.05em;
    }
    .bw-x {
      margin-right: 0.13em;
    }
    /* The r's arm runs on over the top of the o like a roof, to a point by
       the n (Poppins ExtraBold ends it with a straight edge at x 433, y
       357..566; the o after the gap stands 568 tall, so it rises clear). */
    .bw-rs {
      position: absolute;
      top: 0.345em;
      left: 0.425em;
      width: 0.795em;
      height: 0.353em;
      fill: currentColor;
      overflow: visible;
    }
    /* The x's "/" runs on far above the letter and well below the line, at
       its own slant (Poppins ExtraBold: 10..225 at the line up to 404..619 at
       the x-height, in 1/1000 em; here carried 450 higher and 550 lower),
       full weight across the letter and narrowing to a point at each end. */
    .bw-xs {
      position: absolute;
      top: 0.039em;
      left: -0.275em;
      width: 1.11em;
      height: 1.561em;
      fill: currentColor;
      overflow: visible;
    }
    /* Mark only: the crowned B at cap height, on the text's baseline. */
    :host(.bw-mark) {
      align-items: baseline;
    }
    :host(.bw-mark) .bw-b {
      height: 1.04em;
      margin-right: 0.015em;
    }
  `],
})
export class BrandWord {
  readonly mark = input(false);
}
