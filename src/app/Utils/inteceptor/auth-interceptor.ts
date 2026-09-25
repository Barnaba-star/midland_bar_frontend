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

  const token = authService.getToken();
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes('/authentication/login');
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
