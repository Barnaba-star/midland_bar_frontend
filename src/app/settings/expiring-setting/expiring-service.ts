import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { ResponseList } from '../../Utils/models/responces';

export interface ExpiringBranch {
  uid: string;
  branchName: string;
  branchCode: string;
  region: string;
  phone: string;
  closeSubscription: string;
  /** Negative once the subscription has lapsed: -2 means it lapsed 2 days ago. */
  daysLeft: number;
  subscriptionStatus: string;
  subscriptionAmount: number;
  registeredBy: string;
  lastPaymentFailure: string;
}

@Injectable({ providedIn: 'root' })
export class ExpiringService {

  private readonly branchUrl = `${environment.baseApiUrl}/branch`;

  constructor(private http: HttpClient) {}

  findExpiringBranches(days?: number): Observable<ResponseList<ExpiringBranch>> {
    const params: any = {};
    if (days != null) {
      params.days = days;
    }
    return this.http.get<ResponseList<ExpiringBranch>>(
      `${this.branchUrl}/findExpiringBranches`,
      { params }
    );
  }
}
