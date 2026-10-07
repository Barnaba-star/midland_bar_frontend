import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The BaronixTZ logo, which is the word itself - the same as the Android
 * app's: a big crowned B, then "aronix" and an amber "TZ" level with the
 * middle of the B. The T is drawn, not typed: a heavy bar that runs on over
 * the Z to end with it, and a stem of the same weight that curls back to the
 * left and runs under "aronix" as a tail, thinning to a point by the B.
 *
 * The B takes the colour of the text around it, the crown stays amber; it
 * sizes with the font. With [mark]="true" only the crowned B is drawn, at
 * cap height - for headers that show a page title beside it.
 *
 * Measurements are Poppins ExtraBold's (the logo always uses it), in em:
 * an inline box's content area starts 1.05em above the baseline (the
 * font's ascent), capitals are 0.709em tall, T is 0.604em wide.
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
    </svg>@if (!mark()) {<span class="bw-rest" aria-hidden="true"><span class="bw-ar">aronix<svg class="bw-tail" viewBox="0 0 1000 22" preserveAspectRatio="none"><path d="M1010 22C770 22 279 13 0 7C279 5 770 0 1010 0Z"/></svg></span><span class="bw-tz"><i class="bw-bar"></i><span class="bw-t">T<svg class="bw-stem" viewBox="0 0 46 112.9"><path d="M46 10V68.9C46 100.9 34 112.9 0 112.9V90.9C24 90.9 26 82.9 26 68.9V10Z"/></svg></span><em>Z</em></span></span>}
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
    .bw-ar, .bw-tz, .bw-t {
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
    .bw-stem {
      position: absolute;
      top: 0.341em;
      left: calc(50% - 0.36em);
      width: 0.46em;
      height: 1.129em;
      fill: #f5a524;
      overflow: visible;
    }
    .bw-tail {
      position: absolute;
      top: 1.25em;
      left: 0.1em;
      /* An svg won't stretch between left and right: give it the width. */
      width: calc(100% - 0.158em);
      height: 0.22em;
      fill: #f5a524;
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
