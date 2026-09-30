import { SILENT_REQUEST } from './silent-request';
import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';

import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import {
  StatusDialogComponent,
  StatusDialogData
} from '../component/status-dialog/status-dialog';

import { tap } from 'rxjs';

import { ErrorLogService } from '../services/error-log-service';

/** The body as it was about to be sent, so a failure can be traced back to it. */
const serialiseBody = (body: unknown): string | undefined => {
  if (body === null || body === undefined) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  // FormData and Blob carry file bytes - not worth sending, not readable anyway.
  if (body instanceof FormData || body instanceof Blob) {
    return '[binary body]';
  }
  try {
    return JSON.stringify(body);
  } catch {
    return undefined;
  }
};

export const StatusInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {

  const dialog = inject(MatDialog);
  const errorLogService = inject(ErrorLogService);
  const router = inject(Router);

  /*
   * ============================================================
   * 1. IGNORE SPECIFIC REQUESTS
   * ============================================================
   *
   * Profile image inaweza kurudisha 401 lakini haipaswi
   * kuzuia page kuendelea au kuonyesha error dialog.
   */

  if (req.url.includes('/attachment/findUserForProfile')) {
    return next(req);
  }

  /*
   * Screens that say things in their own words.
   *
   * This covers both directions. The backend answers these in codes - EMPTY,
   * NOT_ALLOWED, SENT - which are for the screen to translate, not for a
   * dialog to show raw. A 200 carrying one of those in `message` was popping
   * it up as though it were news.
   *
   * The login screen shows its own message inline, under the form. A dialog
   * on top of it said the same thing twice - and for an expired subscription
   * it covered the button offering the way out.
   */
  const ownsItsMessages =
    req.url.includes('/authentication/login') ||
    // The subscribe dialog shows the reason inside itself; a popup over it
    // said the same thing twice.
    req.url.includes('/authentication/paySubscription') ||
    // The payout dialog reports its own outcome, in its own words. The
    // backend answers here in codes, which a popup would show raw.
    req.url.includes('/payment/payShare') ||
    // The change-password dialog shows its own errors inline, and on a first
    // login it is the whole screen - a popup on top of it has nothing to add.
    req.url.includes('/authentication/changePassword') ||
    // Branch messages and guidance: every outcome is a code the screen
    // has wording for, in both the success and the failure case.
    req.url.includes('/branchMessage/') ||
    req.url.includes('/guidance/') ||
    // Polls: the next one tries again - a popup every few seconds would bury the screen.
    req.context.get(SILENT_REQUEST);


  /*
   * ============================================================
   * 2. SEND REQUEST
   * ============================================================
   */

  return next(req).pipe(

    tap({

      /*
       * ========================================================
       * SUCCESS RESPONSE
       * ========================================================
       */

      next: (event) => {

        if (event instanceof HttpResponse) {

          const body = event.body;

          /*
           * Kama backend imerudisha:
           *
           * {
           *   "message": "Malipo yamefanikiwa"
           * }
           *
           * basi message itaonyeshwa kwenye dialog.
           */

          if (
            !ownsItsMessages &&
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof body.message === 'string' &&
            body.message.trim() !== ''
          ) {

            const dialogData: StatusDialogData = {
              status: 'info',
              message: body.message,
              showClose: true
            };

            dialog.open(StatusDialogComponent, {
              data: dialogData,
              width: '500px',
              panelClass: 'info'
            });
          }
        }
      },


      /*
       * ========================================================
       * ERROR RESPONSE
       * ========================================================
       */

      error: (error) => {

        console.error('🔥 Backend Error Object:', error);

        const status = error?.status;

        /*
         * ======================================================
         * 2b. REPORT UNREACHABLE-BACKEND FAILURES
         * ======================================================
         *
         * Status 0 means no response at all - backend down, DNS,
         * CORS, timeout. Those never reach GlobalExceptionHandler,
         * so this is the only place they can be recorded.
         * Anything with a real status code was already logged
         * server-side; reporting it here too would file it twice.
         */

        if (status === 0 && !errorLogService.isReportingUrl(error?.url)) {
          errorLogService.reportClientError({
            level: 'ERROR',
            message: error?.message ?? 'Backend unreachable',
            exceptionType: 'HttpErrorResponse',
            path: error?.url ?? req.url,
            httpMethod: req.method,
            payload: serialiseBody(req.body)
          });
        }

        /*
         * ======================================================
         * 3. IGNORE PROFILE IMAGE 401
         * ======================================================
         *
         * Hii ni protection ya pili.
         */

        if (
          status === 401 &&
          error?.url?.includes('/attachment/findUserForProfile')
        ) {
          return;
        }

        /*
         * ======================================================
         * 3b. A TOKEN THAT MAY ONLY CHANGE ITS PASSWORD
         * ======================================================
         *
         * The login screen already has them in the forced dialog, so
         * nothing should be calling anything else. If something does -
         * a stray refresh, a bookmarked page - that page can load nothing,
         * so send them back to sign in, which puts the dialog up again.
         */

        if (status === 403 && error?.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
          router.navigate(['/login']);
          return;
        }


        /*
         * ======================================================
         * 4. GET MESSAGE FROM BACKEND
         * ======================================================
         */

        let errorMessage = 'An unexpected error occurred.';


        /*
         * Backend inaweza kurudisha string:
         *
         * "Weka Taarifa za Malipo"
         */

        if (
          typeof error?.error === 'string' &&
          error.error.trim() !== ''
        ) {

          errorMessage = error.error;
        }


        /*
         * Backend inaweza kurudisha:
         *
         * {
         *   "message": "Weka Commission REF"
         * }
         */

        else if (
          error?.error?.message &&
          typeof error.error.message === 'string'
        ) {

          errorMessage = error.error.message;
        }


        /*
         * ======================================================
         * 5. HANDLE HTTP STATUS
         * ======================================================
         */

        switch (status) {

          case 400:

            /*
             * Kama backend imetuma message yake,
             * usiibadilishe.
             */

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Bad Request. Please check the information you provided.';
            }

            break;


          case 401:

            /*
             * Usifanye router.navigate(['/login']) hapa.
             *
             * AuthInterceptor ndiyo inapaswa kushughulikia
             * authentication.
             */

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Unauthorized: Please login to continue.';
            }

            break;


          case 403:

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Access Denied. You do not have permission to perform this action.';
            }

            break;


          case 404:

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Resource not found. Please check the URL or try again later.';
            }

            break;


          case 500:

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Internal Server Error. Please contact support if this persists.';
            }

            break;


          case 502:

            if (
              !error?.error?.message &&
              typeof error?.error !== 'string'
            ) {
              errorMessage =
                'Bad Method, Check URL.';
            }

            break;


          default:

            /*
             * Kwa errors nyingine tumia message ya backend
             * kama ipo.
             */

            break;
        }


        /*
         * ======================================================
         * 6. OPEN ERROR DIALOG
         * ======================================================
         */

        if (ownsItsMessages) {
          return;
        }

        const dialogData: StatusDialogData = {

          status: 'error',

          message: errorMessage,

          showClose: true
        };


        dialog.open(StatusDialogComponent, {

          data: dialogData,

          width: '400px',

          panelClass: 'error'
        });

      }

    })

  );
};
