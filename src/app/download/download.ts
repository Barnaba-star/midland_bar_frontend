import { ChangeDetectionStrategy, Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

/**
 * /app - download the BaronixTZ Android app. The APKs live in
 * public/downloads/ with the version in the file name (the site serves
 * static files with a one-year cache, so a new version needs a new name).
 * Bump APP_VERSION and the sizes together with the files.
 */
const APP_VERSION = '1.0.1';

@Component({
  selector: 'app-download',
  imports: [RouterLink, MatIconModule, TranslatePipe, BrandWord],
  templateUrl: './download.html',
  styleUrl: './download.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Download {
  readonly version = APP_VERSION;
  readonly main = { href: `/downloads/baronixtz-${APP_VERSION}.apk`, mb: 21.7 };
  readonly older = { href: `/downloads/baronixtz-${APP_VERSION}-32bit.apk`, mb: 19.8 };
  readonly currentYear = new Date().getFullYear();
  /** iPhone/iPad: the app is Android only for now - point them at the website. */
  readonly isApple: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isApple = isPlatformBrowser(platformId) && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
}
