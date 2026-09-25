import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response, ResponseList } from '../../Utils/models/responces';
import { CommissionPayout, StaffBranch, StaffCommission, SubscriptionPayment } from './commission-model';

@Injectable({
  providedIn: 'root',
})
export class CommissionService {
  constructor(private http: HttpClient) {}

  private commissionURL = `${environment.baseApiUrl}/commission`;

  findStaffCommissionReport(year: number, month: number, search?: string): Observable<ResponseList<StaffCommission>> {
    let params = new HttpParams().set('year', year).set('month', month);
    // An empty `search` would narrow nothing, so it is left off entirely.
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<ResponseList<StaffCommission>>(
      `${this.commissionURL}/staffCommissionReport`,
      { params }
    );
  }

  findStaffPayments(staffUID: string, year: number, month: number): Observable<ResponseList<SubscriptionPayment>> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ResponseList<SubscriptionPayment>>(
      `${this.commissionURL}/staffPayments/${staffUID}`,
      { params }
    );
  }

  findStaffBranches(staffUID: string, year: number, month: number): Observable<ResponseList<StaffBranch>> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ResponseList<StaffBranch>>(
      `${this.commissionURL}/staffBranches/${staffUID}`,
      { params }
    );
  }

  // No amount is sent - the backend recomputes what is owed, so the browser
  // can never name its own payout figure.
  payStaffCommission(staffUID: string, year: number, month: number, note: string | null)
    : Observable<Response<CommissionPayout>> {
    return this.http.post<Response<CommissionPayout>>(
      `${this.commissionURL}/payStaffCommission`,
      { staffUid: staffUID, year, month, note }
    );
  }
}
