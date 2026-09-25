import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorLogService } from '../services/error-log-service';

/**
 * Catches everything Angular would otherwise only print to the console and
 * sends it to the backend, so it turns up under Settings > Errors.
 *
 * HttpErrorResponse is skipped here: StatusInterceptor already sees every
 * failed request and reports it, and handling it in both places would file
 * each one twice.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  // ErrorHandler is constructed before the HTTP stack, so the service is
  // resolved lazily on the first error rather than injected up front.
  private readonly injector = inject(Injector);

  handleError(error: any): void {
    // Keep the console behaviour developers already rely on.
    console.error(error);

    if (error instanceof HttpErrorResponse) {
      return;
    }

    try {
      const errorLogService = this.injector.get(ErrorLogService);
      const wrapped = error?.rejection ?? error;
      errorLogService.reportClientError({
        level: 'ERROR',
        message: wrapped?.message ?? String(wrapped),
        exceptionType: wrapped?.name ?? 'Error',
        stackTrace: wrapped?.stack ?? null,
        path: typeof window !== 'undefined' ? window.location.pathname : null
      } as any);
    } catch {
      // Reporting must never replace the original error.
    }
  }
}
