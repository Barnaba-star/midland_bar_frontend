import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../enviroments/environment';
import { Response, ResponsePage } from '../models/responces';

export interface ErrorLog {
  uid: string;
  source: 'BACKEND' | 'FRONTEND';
  level: 'ERROR' | 'WARN';
  occurredAt: string;
  message: string;
  exceptionType: string;
  stackTrace: string;
  path: string;
  httpMethod: string;
  username: string;
  branchUid: string;
  userAgent: string;
  payload: string;
  queryString: string;
}

export interface ClientError {
  level?: string;
  message?: string;
  exceptionType?: string;
  stackTrace?: string;
  path?: string;
  httpMethod?: string;
  payload?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorLogService {

  private readonly monitoringUrl = `${environment.baseApiUrl}/monitoring`;

  constructor(private http: HttpClient) {}

  findErrorPage(
    pageableParam: any,
    source?: string,
    level?: string
  ): Observable<ResponsePage<ErrorLog>> {
    const params: any = {};
    if (source) {
      params.source = source;
    }
    if (level) {
      params.level = level;
    }
    return this.http.post<ResponsePage<ErrorLog>>(
      `${this.monitoringUrl}/findErrorPage`,
      pageableParam,
      { params }
    );
  }

  findErrorSummary(): Observable<Response<{ lastDay: number; lastWeek: number }>> {
    return this.http.get<Response<{ lastDay: number; lastWeek: number }>>(
      `${this.monitoringUrl}/findErrorSummary`
    );
  }

  clearErrors(): Observable<Response<number>> {
    return this.http.delete<Response<number>>(`${this.monitoringUrl}/clearErrors`);
  }

  /**
   * Sends one browser-side error to the backend. Swallows its own failure on
   * purpose: if reporting an error itself errored, surfacing that would just
   * loop, and the user already has the original problem in front of them.
   */
  reportClientError(clientError: ClientError): void {
    this.http
      .post<Response<boolean>>(`${this.monitoringUrl}/reportClientError`, clientError)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /** True for our own reporting endpoint, so a failure there is never re-reported. */
  isReportingUrl(url: string | null | undefined): boolean {
    return !!url && url.includes('/monitoring/reportClientError');
  }
}
