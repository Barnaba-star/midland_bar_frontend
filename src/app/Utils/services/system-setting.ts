import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Response } from '../models/responces';
import { environment } from '../enviroments/environment';

export interface SystemSettingData {
  uid?: string;
  logoImage?: string;
  companyName?: string;
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
}
