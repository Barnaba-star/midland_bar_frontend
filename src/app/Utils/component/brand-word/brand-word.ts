import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The BaronixTZ logo, which is the word itself: the B is the crowned B mark
 * (no tile), then "aronix" and an amber "TZ". The B takes the colour of the
 * text around it, the crown stays amber; it sizes with the font. With
 * [mark]="true" only the crowned B is drawn - for headers that show a page
 * title beside it.
 */
@Component({
  selector: 'app-brand-word',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', 'aria-label': 'BaronixTZ' },
  template: `
    <svg class="bw-b" viewBox="18 5 30 48" aria-hidden="true">
      <path d="M22 15.5 20.6 9l4.9 3.4L32 6.5l6.5 5.9L43.4 9 42 15.5z" fill="#f5a524"/>
      <path fill="currentColor" fill-rule="evenodd"
            d="M19 19h15.5c6.4 0 10.5 3.4 10.5 8.6 0 3.2-1.6 5.6-4.3 6.9 3.7 1.2 5.8 4 5.8 7.8 0 6-4.6 9.7-11.6 9.7H19zm8 6.6v6.5h6.8c2.4 0 3.8-1.2 3.8-3.2s-1.4-3.3-3.8-3.3zm0 12.4v7.4h7.8c2.7 0 4.3-1.4 4.3-3.7s-1.6-3.7-4.3-3.7z"/>
    </svg>@if (!mark()) {<span class="bw-rest" aria-hidden="true">aronix<em>TZ</em></span>}
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: baseline;
      white-space: nowrap;
      line-height: 1;
    }
    /* The B sits on the baseline at cap height; the crown rises above it. */
    .bw-b {
      height: 1.04em;
      width: auto;
      flex-shrink: 0;
      margin-right: 0.015em;
    }
    em {
      font-style: normal;
      color: #f5a524;
    }
  `],
})
export class BrandWord {
  readonly mark = input(false);
}
