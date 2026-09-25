import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response } from '../../Utils/models/responces';

/** One person on the payment schedule. */
export interface PayrollLine {
  uid: string;
  /** ROOT, DIRECTOR or STAFF - how they came to be owed this. */
  role: string;
  name: string;
  phone: string | null;
  /** Which branch they belong to. */
  branchName: string | null;
  /** Set by its owner, from their own profile. */
  accountNumber: string | null;
  bankName: string | null;
  /** The name the account is held in, which the bank checks against. */
  accountName: string | null;
  earned: number;
  paid: number;
  /** What the bank is being asked to send. */
  toPay: number;
}

/** How the month divided before it was broken down by person. */
export interface RevenueShare {
  revenue: number;
  payments: number;
  staffPercent: number;
  staffAmount: number;
  directorPercent: number;
  directorCount: number;
  directorAmount: number;
  rootPercent: number;
  rootCount: number;
  rootAmount: number;
  operatingAmount: number;
}

export interface Payroll {
  /** Whose payroll this is - printed at the top of the sheet. */
  companyName: string | null;
  year: number;
  month: number;
  generatedAt: string;
  revenue: number;
  /** The split the lines come from, so the totals can be checked. */
  share: RevenueShare | null;
  totalEarned: number;
  totalPaid: number;
  totalToPay: number;
  recipients: number;
  /** How many are already settled in full. */
  settled: number;
  /** A bank needs a number; this says how many are missing one. */
  missingPhone: number;
  /** And how many still owed money have no account number to send it to. */
  missingAccount: number;
  lines: PayrollLine[];
}

@Injectable({ providedIn: 'root' })
export class PayrollService {

  constructor(private http: HttpClient) {}

  private readonly paymentUrl = `${environment.baseApiUrl}/payment`;

  /** Both parts are optional; leaving them out asks for the current month. */
  findPayroll(year?: number, month?: number): Observable<Response<Payroll>> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year);
    }
    if (month != null) {
      params = params.set('month', month);
    }
    return this.http.get<Response<Payroll>>(`${this.paymentUrl}/findPayroll`, { params });
  }
}
