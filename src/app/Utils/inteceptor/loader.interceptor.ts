import { SILENT_REQUEST } from './silent-request';
import { HttpInterceptorFn, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoaderService } from '../services/loader-service';
import { finalize } from 'rxjs';

export const LoaderInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  if (req.context.get(SILENT_REQUEST)) {
    return next(req);
  }
  const loaderService = inject(LoaderService);
  loaderService.show();

  return next(req).pipe(
    finalize(() => loaderService.hide())
  );
};
