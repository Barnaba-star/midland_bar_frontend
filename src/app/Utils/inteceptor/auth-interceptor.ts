import { HttpContextToken, HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { Authentication } from '../services/authentication';

/**
 * A request made as another login than the one in use - the counter's own
 * login while it works its bills in Staff Sell, still listening for orders.
 * Its 401 never signs anyone out.
 */
export const AS_TOKEN = new HttpContextToken<string | null>(() => null);

export const AuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(Authentication);
  const router = inject(Router);

  // A wrong code or PIN on a sign-in is not an expired session - e.g. a
  // colleague signing in from Staff Sell must not throw out the one there.
  const isLoginRequest = req.url.includes('/authentication/login')
    || req.url.includes('/authentication/staffLogin')
    || req.url.includes('/authentication/staffSetup');

  // A sign-in carries no old token: an expired one left in the browser made
  // the backend refuse the sign-in itself (500), so login never went through.
  const asToken = req.context.get(AS_TOKEN);
  const token = isLoginRequest ? null : (asToken ?? authService.getToken());
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isProfilePicRequest = req.url.includes('/attachment/findUserForProfile');

      if (error.status === 401 && !isLoginRequest && !isProfilePicRequest && !asToken) {
        authService.stopHeartbeat();
        authService.removeToken();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
