import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { PageableParam, Response, ResponseList, ResponsePage } from '../../Utils/models/responces';

export interface SubscriptionPayment {
  uid: string;
  createdAt: string;
  paidAt: string;
  amount: number;
  months: number;
  reference: string;
  branchName: string;
  branchCode: string;
  branchUid: string;
  commissionAmount: number;
  commissionPercent: number;
  staffName: string;
  staffUid: string;
}

/** The branch shape the unresolved-payments endpoint returns. */
export interface UnresolvedBranch {
  uid: string;
  branchName: string;
  branchCode: string;
  subscriptionStatus: string;
  pendingPaymentRef: string;
  pendingPaymentAt: string;
  lastPaymentFailure: string;
  subscriptionAmount: number;
  closeSubscription: string;
}

/** How one month's income is split between staff, directors, ROOT and running costs. */
export interface RevenueShareDTO {
  year: number;
  month: number;
  revenue: number;
  payments: number;
  staffPercent: number;
  staffAmount: number;
  directorPercent: number;
  directorCount: number;
  directorAmount: number;
  rootPercent: number;
  /** How many hold the role, so the screen can say the share is split. */
  rootCount: number;
  rootAmount: number;
  operatingAmount: number;
}

/** One person holding a share-earning role, and what the month came to for them. */
export interface ShareRecipientDTO {
  uid: string;
  name: string;
  username: string;
  /** What the month earned them. */
  amount: number;
  /** Only staff commission payouts are tracked today; the other roles report 0. */
  paid: number;
  outstanding: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private readonly paymentUrl = `${environment.baseApiUrl}/payment`;

  constructor(private http: HttpClient) {}

  findPaymentPage(pageableParam: PageableParam): Observable<ResponsePage<SubscriptionPayment>> {
    return this.http.post<ResponsePage<SubscriptionPayment>>(
      `${this.paymentUrl}/findPaymentPage`,
      pageableParam
    );
  }

  findUnresolvedPayments(): Observable<ResponseList<UnresolvedBranch>> {
    return this.http.get<ResponseList<UnresolvedBranch>>(
      `${this.paymentUrl}/findUnresolvedPayments`
    );
  }

  reconcile(branchUid: string): Observable<Response<string>> {
    return this.http.post<Response<string>>(
      `${this.paymentUrl}/reconcile/${branchUid}`,
      {}
    );
  }

  /** data is null when Snippe can't be reached - the page says so instead of showing 0. */
  findPaymentTotals(): Observable<Response<{ payments: number; totalAmount: number; totalCommission: number; thisMonth: number }>> {
    return this.http.get<Response<{ payments: number; totalAmount: number; totalCommission: number; thisMonth: number }>>(
      `${this.paymentUrl}/findPaymentTotals`
    );
  }

  /** Both parts are optional; leaving them out asks the backend for the current month. */
  findRevenueShare(year?: number, month?: number): Observable<Response<RevenueShareDTO>> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year);
    }
    if (month != null) {
      params = params.set('month', month);
    }
    return this.http.get<Response<RevenueShareDTO>>(
      `${this.paymentUrl}/findRevenueShare`,
      { params }
    );
  }

  /** Who holds one share-earning role - STAFF, DIRECTOR or ROOT - and what each is owed. */
  findShareRecipients(role: string, year?: number, month?: number): Observable<ResponseList<ShareRecipientDTO>> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year);
    }
    if (month != null) {
      params = params.set('month', month);
    }
    return this.http.get<ResponseList<ShareRecipientDTO>>(
      `${this.paymentUrl}/findShareRecipients/${role}`,
      { params }
    );
  }

  /**
   * Records that one person's share for a month has been handed over. No money
   * moves - this only writes the payout down.
   *
   * Refusals come back as HTTP 200 with a null data and the reason in message,
   * so the caller tells the two apart by whether data is there.
   *
   * Leaving amount out settles the whole of what is owed. Sending one records
   * part of it instead - the backend refuses anything above the outstanding
   * figure rather than quietly trimming it.
   */
  payShare(role: string, uid: string, year?: number, month?: number, note?: string, amount?: number): Observable<Response<number>> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year);
    }
    if (month != null) {
      params = params.set('month', month);
    }
    if (note != null && note !== '') {
      params = params.set('note', note);
    }
    if (amount != null) {
      params = params.set('amount', amount);
    }
    return this.http.post<Response<number>>(
      `${this.paymentUrl}/payShare/${role}/${uid}`,
      {},
      { params }
    );
  }

  findBalance(): Observable<Response<number | null>> {
    return this.http.get<Response<number | null>>(`${this.paymentUrl}/findBalance`);
  }
}
