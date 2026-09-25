import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response } from '../../Utils/models/responces';

/**
 * The single row of platform-wide numbers the backend keeps.
 * `uid` is absent until the row has been saved once.
 */
export interface PlatformSetting {
  uid?: string;

  commissionPercent: number;
  directorPercent: number;
  rootPercent: number;
  trialDays: number;
  gracePeriodDays: number;
  minimumPaymentAmount: number;
  defaultSubscriptionAmount: number;
  defaultSubscriptionDays: number;

  sessionHours: number;

  errorRetentionDays: number;
  errorPurgeDays: number;
}

@Injectable({
  providedIn: 'root',
})
export class PlatformSettingService {
  constructor(private http: HttpClient) {}

  private platformSettingURL = `${environment.baseApiUrl}/platformSetting`;

  findPlatformSetting(): Observable<Response<PlatformSetting>> {
    return this.http.get<Response<PlatformSetting>>(
      `${this.platformSettingURL}/findPlatformSetting`
    );
  }

  // The whole row goes back: the backend validates it as one set, since
  // several of these numbers only make sense relative to each other.
  savePlatformSetting(setting: PlatformSetting): Observable<Response<PlatformSetting>> {
    return this.http.post<Response<PlatformSetting>>(
      `${this.platformSettingURL}/savePlatformSetting`,
      setting
    );
  }
}
