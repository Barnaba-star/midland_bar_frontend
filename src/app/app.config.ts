import {
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';

import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
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
import { LoaderInterceptor } from './Utils/inteceptor/loader.interceptor';
import { GlobalErrorHandler } from './Utils/handlers/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [

    provideBrowserGlobalErrorListeners(),

    // Everything Angular throws gets recorded under Settings > Errors.
    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    provideZonelessChangeDetection(),
    provideNativeDateAdapter(),

    // Every page's code is fetched in the background once the app is up, so
    // after signing in Staff Sell, POS... open without a wait.
    provideRouter(routes, withPreloading(PreloadAllModules)),

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
        // The progress bar along the top while a request is out.
        LoaderInterceptor,
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
      lang: 'sw'
    })

  ]
};
