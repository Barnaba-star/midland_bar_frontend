import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The BaronixTZ logo, which is the word itself - the same as the Android
 * app's: a big B, then "aronix" and an amber "TZ", all on one line. The r is
 * gold, its arm running on over the o to a point by the n. The x is drawn:
 * its "\\" and its "/", which below the line bends left and runs under the
 * word to a point by the B, and above the letter carries on up as a short
 * chain of four links, clear of the TZ - in the text's colour, over a gold x
 * set a little to its right that shows as its shadow.
 *
 * The B takes the colour of the text around it and sizes with the font.
 * With [mark]="true" only the B is drawn, at cap height - for headers that
 * show a page title beside it.
 *
 * Measurements are Poppins ExtraBold's (the logo always uses it), in em.
 */
@Component({
  selector: 'app-brand-word',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', 'aria-label': 'BaronixTZ', '[class.bw-mark]': 'mark()' },
  template: `
    <svg class="bw-b" viewBox="18 19 30 34" aria-hidden="true">
      <path fill="currentColor" fill-rule="evenodd"
            d="M19 19h15.5c6.4 0 10.5 3.4 10.5 8.6 0 3.2-1.6 5.6-4.3 6.9 3.7 1.2 5.8 4 5.8 7.8 0 6-4.6 9.7-11.6 9.7H19zm8 6.6v6.5h6.8c2.4 0 3.8-1.2 3.8-3.2s-1.4-3.3-3.8-3.3zm0 12.4v7.4h7.8c2.7 0 4.3-1.4 4.3-3.7s-1.6-3.7-4.3-3.7z"/>
    </svg>@if (!mark()) {<span class="bw-rest" aria-hidden="true"><span class="bw-line">a<span class="bw-r">r<svg class="bw-rs" viewBox="425 -705 795 353"><path d="M430 -566C520 -640 750 -700 900 -700C1050 -700 1150 -660 1215 -600C1130 -625 1030 -640 900 -640C750 -640 560 -610 480 -500C455 -460 438 -400 430 -357Z"/></svg></span>oni<span class="bw-x">x<svg class="bw-xs" viewBox="-2760 -1400 3800 1760"><path d="M10 -561L225 -561L619 0L404 0Z"/><path d="M404 -561L619 -561L225 0C160 120 -330 215 -600 225C-1500 250 -2297 285 -2747 270C-2297 300 -1500 350 -600 340C-260 330 -120 180 10 0Z"/><ellipse cx="558" cy="-682" rx="141" ry="73" transform="rotate(-60.1 558 -682)" fill="none" stroke="currentColor" stroke-width="70"/><ellipse cx="664" cy="-868" rx="141" ry="26" transform="rotate(-60.1 664 -868)" fill="currentColor"/><ellipse cx="771" cy="-1052" rx="141" ry="73" transform="rotate(-60.1 771 -1052)" fill="none" stroke="currentColor" stroke-width="70"/><ellipse cx="877" cy="-1238" rx="141" ry="26" transform="rotate(-60.1 877 -1238)" fill="currentColor"/></svg></span><span class="bw-tz"><em class="bw-t">T</em><em>Z</em></span></span></span>}
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
    /* A big B, the words centred on it. */
    .bw-b {
      height: 1.24em;
      width: auto;
      flex-shrink: 0;
      margin-right: 0.04em;
    }
    .bw-line, .bw-tz, .bw-t, .bw-x, .bw-r {
      position: relative;
    }
    /* The words a touch larger than the B alone would set them. */
    .bw-rest {
      font-size: 1.16em;
    }
    /* The TZ a touch larger again, T and Z apart. */
    .bw-tz {
      font-size: 1.12em;
    }
    .bw-t {
      margin-right: 0.05em;
    }
    em {
      font-style: normal;
      color: #f5a524;
    }
    /* Room after the r (for its longer arm) and after the x (so its long
       stroke clears the T). */
    .bw-r {
      margin-right: 0.05em;
      color: #f5a524; /* the r in gold, like its arm */
    }
    /* The typed x keeps its place only (its drawing is .bw-xs, in the
       text's colour); room after it so the chain stays clear of the T. */
    /* The typed x is not seen, only its gold shadow a little to the right,
       under the drawn x; room after it so the chain and shadow clear the T. */
    .bw-x {
      margin-left: 0.07em;
      margin-right: 0.28em;
      -webkit-text-fill-color: transparent;
      text-shadow: 0.11em 0 0 #f5a524;
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
      fill: #f5a524;
      overflow: visible;
    }
    /* The x drawn (Poppins ExtraBold: strokes 10..225 at one edge to
       404..619 at the other, x-height 561, in 1/1000 em). The "/" bends
       left below the line and runs under the word, thinning to a point by
       the B; above the x a chain of four links rises to 1330. */
    .bw-xs {
      position: absolute;
      top: -0.35em;
      left: -2.76em;
      width: 3.8em;
      height: 1.76em;
      fill: currentColor;
      overflow: visible;
    }
    /* Mark only: the B at cap height, on the text's baseline. */
    :host(.bw-mark) {
      align-items: baseline;
    }
    :host(.bw-mark) .bw-b {
      height: 0.74em;
      margin-right: 0.015em;
    }
  `],
})
export class BrandWord {
  readonly mark = input(false);
}
