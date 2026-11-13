import { ChangeDetectionStrategy, Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../Utils/enviroments/environment';
import { silent } from '../Utils/inteceptor/silent-request';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { BrandWord } from '../Utils/component/brand-word/brand-word';

/**
 * /app - download the BaronixTZ Android app. The APK lives on the backend's
 * volume, not inside this website (owner, 2026-11-13): a 62 MB file in here
 * made every website deploy a 62 MB upload. The page asks the backend which
 * version is newest, so a new release needs no website deploy at all - the
 * file is dropped into UPLOAD_DIR/app/ as baronixtz-x.y.z.apk.
 * One APK for every Android phone, old (32-bit) and new (64-bit).
 */
const FALLBACK = { version: '1.0.143', file: '/public/app/baronixtz-1.0.143.apk', mb: 62.7 };

@Component({
  selector: 'app-download',
  imports: [RouterLink, MatIconModule, TranslatePipe, BrandWord],
  templateUrl: './download.html',
  styleUrl: './download.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Download {
  readonly version = signal(FALLBACK.version);
  readonly main = signal({ href: environment.baseApiUrl + FALLBACK.file, mb: FALLBACK.mb });
  readonly currentYear = new Date().getFullYear();
  /** iPhone/iPad: the app is Android only for now - point them at the website. */
  readonly isApple: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object, http: HttpClient) {
    this.isApple = isPlatformBrowser(platformId) && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isPlatformBrowser(platformId)) {
      http.get<{ data?: { version?: string; file?: string; mb?: number } }>(`${environment.baseApiUrl}/public/app/latest`, { context: silent() })
        .subscribe({
          next: (res) => {
            const d = res?.data;
            if (d?.version && d.file) {
              this.version.set(d.version);
              this.main.set({ href: environment.baseApiUrl + d.file, mb: d.mb ?? FALLBACK.mb });
            }
          },
          error: () => {},
        });
    }
  }
}
