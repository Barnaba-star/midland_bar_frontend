import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Response } from '../models/responces';
import { environment } from '../enviroments/environment';

export interface SystemSettingData {
  uid?: string;
  logoImage?: string;
  companyName?: string;
  taxTin?: string | null;
  taxVrn?: string | null;
  efdSerial?: string | null;
  cashierDiscountPercent?: number | null;
  alertVoidsPerShift?: number | null;
  alertShortageAmount?: number | null;
  alertShiftHours?: number | null;
}

@Injectable({ providedIn: 'root' })
export class SystemSettingService {

  private baseUrl = `${environment.baseApiUrl}/systemSetting`;

  constructor(private http: HttpClient) { }

  getLogo(): Observable<Response<SystemSettingData>> {
    return this.http.get<Response<SystemSettingData>>(`${this.baseUrl}/logo`);
  }

  uploadLogo(file: FormData): Observable<Response<SystemSettingData>> {
    return this.http.post<Response<SystemSettingData>>(`${this.baseUrl}/uploadLogo`, file);
  }

  /** TRA details, the cashier's discount limit and the theft-alert thresholds. */
  saveBranch(body: Partial<SystemSettingData>): Observable<Response<SystemSettingData>> {
    return this.http.post<Response<SystemSettingData>>(`${this.baseUrl}/branch`, body);
  }

  /** Back to the BaronixTZ logo. */
  removeLogo(): Observable<Response<SystemSettingData>> {
    return this.http.post<Response<SystemSettingData>>(`${this.baseUrl}/removeLogo`, null);
  }
}
