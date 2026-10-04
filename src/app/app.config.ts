import {
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';

import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import {
  provideHttpClient,
  withFetch,
  withInterceptors
} from '@angular/common/http';

import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { AuthInterceptor } from './Utils/inteceptor/auth-interceptor';
import { provideNativeDateAdapter } from '@angular/material/core';
import { StatusInterceptor } from './Utils/inteceptor/status-interceptor';
import { OfflineInterceptor } from './Utils/inteceptor/offline-interceptor';
import { GlobalErrorHandler } from './Utils/handlers/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [

    provideBrowserGlobalErrorListeners(),

    // Everything Angular throws gets recorded under Settings > Errors.
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    provideZonelessChangeDetection(),
    provideNativeDateAdapter(),

    provideRouter(routes),

    // Keeps the app's own files on the device so it opens without internet.
    // Production builds only - ng serve has no service worker.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),

    provideClientHydration(
      withEventReplay()
    ),

  provideHttpClient(
      withFetch(),
      withInterceptors([
        // Outermost: answers from the device and queues sales when there is no internet.
        OfflineInterceptor,
        AuthInterceptor,
        StatusInterceptor
      ])
    ),

    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json'
      }),
      fallbackLang: 'en',
      lang: 'en'
    })

  ]
};
