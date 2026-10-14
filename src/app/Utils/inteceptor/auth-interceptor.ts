import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { Authentication } from '../services/authentication';

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
  const token = isLoginRequest ? null : authService.getToken();
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

      if (error.status === 401 && !isLoginRequest && !isProfilePicRequest) {
        authService.stopHeartbeat();
        authService.removeToken();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
