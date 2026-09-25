import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response, ResponsePage } from '../../Utils/models/responces';

export interface AuditLog {
  uid: string;
  occurredAt: string;
  username: string;
  fullName: string;
  branchUid: string;
  action: string;
  httpMethod: string;
  path: string;
  queryString: string;
  payload: string;
  statusCode: number;
  outcome: 'SUCCESS' | 'FAILED';
  durationMs: number;
  ipAddress: string;
  userAgent: string;
}

export interface AuditSummary {
  lastDay: number;
  lastWeek: number;
  activeUsers: number;
}

/** How much is held, and how much of it is old enough to be removed. */
export interface AuditStorage {
  total: number;
  olderThan30: number;
  olderThan90: number;
  olderThan365: number;
}

@Injectable({ providedIn: 'root' })
export class AuditService {

  private readonly auditUrl = `${environment.baseApiUrl}/audit`;

  constructor(private http: HttpClient) {}

  findAuditPage(
    pageableParam: any,
    username?: string,
    outcome?: string
  ): Observable<ResponsePage<AuditLog>> {
    const params: any = {};
    if (username) {
      params.username = username;
    }
    if (outcome) {
      params.outcome = outcome;
    }
    return this.http.post<ResponsePage<AuditLog>>(
      `${this.auditUrl}/findAuditPage`,
      pageableParam,
      { params }
    );
  }

  findAuditSummary(): Observable<Response<AuditSummary>> {
    return this.http.get<Response<AuditSummary>>(`${this.auditUrl}/findAuditSummary`);
  }

  findAuditStorage(): Observable<Response<AuditStorage>> {
    return this.http.get<Response<AuditStorage>>(`${this.auditUrl}/findAuditStorage`);
  }

  /**
   * Removes everything older than `days`, which the backend refuses to take
   * below 30. The count removed comes back in `data`.
   */
  purgeAuditLog(days: number): Observable<Response<number>> {
    return this.http.post<Response<number>>(
      `${this.auditUrl}/purgeAuditLog`,
      {},
      { params: { days } }
    );
  }
}
