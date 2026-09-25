import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../Utils/enviroments/environment';
import { CommissionDTO, PayStockAndPurchaseDTO, SaleOpenedDTO, BarBookingDTO, BarSalesDTO, BarServiceDTO, BarStaffDTO, SpendDTO, StaffCommissionDTO, StoreDTO, StockReceiptDTO } from './BarModel';
import { PageableParam, Response, ResponseList, ResponsePage } from '../Utils/models/responces';

@Injectable({
  providedIn: 'root',
})
export class ServiceBarMethod {
    constructor(private http:HttpClient){}
      private api = environment.baseApiUrl
      private barURL: string = `${this.api}/bar`;
      private roleURL: string = `${this.api}/role`;

  refreshPage(): void {
    window.location.reload();
  }

/***
 * BAR-SERVICES-METHODS
 */

saveBarEntity(barServiceDTO:BarServiceDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveBarEntity`, barServiceDTO);
}
findBarServiceByUID(barServiceUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findBarServiceByUID/${barServiceUID}`);
}
findBarServiceList():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.barURL}/findBarServiceList`)
}
findBarServicePage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarServicePage`, params);
}
deleteServiceBarByUID(barServiceUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteServiceBarByUID/${barServiceUID}`, null)
}

/***
 * BAR-COMMISSIONS-METHODS
 */
saveCommissions(commissionsDTO:CommissionDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveCommissions`, commissionsDTO);
}
findCommissionByUID(commissionUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findCommissionByUID/${commissionUID}`);
}
findCommissionList():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.barURL}/findCommissionList`)
}
/** Every service with its commission split, or empty fields where none is set. */
findServiceCommissionPage(params: PageableParam): Observable<ResponsePage<any>> {
  return this.http.post<ResponsePage<any>>(`${this.barURL}/findServiceCommissionPage`, params);
}
findCommissionPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findCommissionPage`, params);
}
deleteCommission(commissionUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteCommission/${commissionUID}`, null)
}

/***
 * BAR-STAFF-METHODS
 */
saveBarStaff(barStaffDTO:BarStaffDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveBarStaff`, barStaffDTO);
}
findBarStaffByUID(barStaffUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findBarStaffByUID/${barStaffUID}`);
}
findBarStaffList():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.barURL}/findBarStaffList`);
}
findBarStaffPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarStaffPage`, params);
}
deleteBarStaff(barStaffUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteBarStaff/${barStaffUID}`, null);
}

/***
 * BAR-BOOKING-METHODS
 */
saveServiceBooking(barBookingDTO:BarBookingDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveServiceBooking`, barBookingDTO);
}
findBarBookingByUID(barBookingUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findBarBookingByUID/${barBookingUID}`);
}
findBarBooking():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.barURL}/findBarBooking`);
}
findBarBookingPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarBookingPage`, params);
}
deleteBarBooking(barBookingUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteBarBooking/${barBookingUID}`, null);
}

/***
 * BAR-SALES-METHODS
 */
saveBarSales(barSalesDTO:BarSalesDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveBarSales`, barSalesDTO);
}
findBarSalesByUID(barSalesUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findBarSalesByUID/${barSalesUID}`);
}
findBarSalesList(barOpenUID: string): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>( `${this.barURL}/findBarSalesList/${barOpenUID}`);
}

findBarSalesListActiveTrue(): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>( `${this.barURL}/findBarSalesListActiveTrue`);
}

salesOpenedList(): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>( `${this.barURL}/salesOpenedList`);
}

findBarSalesPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarSalesPage`, params);
}
deleteBarSales(barSalesUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteBarSales/${barSalesUID}`, null);
}

saveOpenSale(saleOpenedDTO: SaleOpenedDTO ):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveOpenSale`, saleOpenedDTO);
}

salesOpenedListByStatus(filter: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/salesOpenedListByStatus/${filter}`);
}

findStaffCommissionPage(params: PageableParam): Observable<ResponsePage<any>> {
  return this.http.post<ResponsePage<any>>(`${this.barURL}/findStaffCommissionPage`, params);
}

/***
 * BAR-REPORTS-METHODS
 */

findBarReportByUID(barReportsUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.barURL}/findBarReportByUID/${barReportsUID}`);
}
findBarReportsPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarReportsPage`, params);
}



findBarRevenueReport(date: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findBarRevenueReport/${date}`);
}

findBarRevenueByService(date: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findBarRevenueByService/${date}`);
}

payStaffCommission(staffCommissionDTO:StaffCommissionDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/payStaffCommission`, staffCommissionDTO);
}

findCurrentBarRevenueByService(filter: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findCurrentBarRevenueByService/${filter}`);
}

findCurrentBarReportsPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findCurrentBarReportsPage`, params);
}

findCurrentBarRevenueReport(filter: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findCurrentBarRevenueReport/${filter}`);
}



/***
 * BAR-STORE-METHODS
 */
saveStore(storeDTO:StoreDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/saveStore`, storeDTO);
}

addQuantityToStore(storeDTO:StoreDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/addQuantityToStore`, storeDTO);
}

findBarStoreList():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.barURL}/findBarStoreList`);
}
findBarStorePage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findBarStorePage`, params);
}
findOpenStorePage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findOpenStorePage`, params);
}
deleteStore(storeUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/deleteStore/${storeUID}`, null);
}
openStore(storeDTO:StoreDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/openStore`, storeDTO);
}
closeOpenStore(storeDTO:StoreDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/closeOpenStore`, storeDTO);
}

findServiceEntityUIDList(status:string):Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findServiceEntityUIDList/${status}`);
}

findServiceAndStoreReportPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findServiceAndStoreReportPage`, params);
}

/***
 * BAR-USERS-METHODS
 */
/**
 * Takes a branch user's way into the system away, or gives it back.
 * Blocked rather than deleted: their uid is what the commission report and
 * every payment record point at.
 */
setUserBlocked(userUID: string, blocked: boolean): Observable<Response<string>> {
  return this.http.post<Response<string>>(`${this.barURL}/setUserBlocked/${userUID}/${blocked}`, {});
}

findUserPageByBranch(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.barURL}/findUserPageByBranch`, params);
}

/***
 * BAR-INCOME-EXPENSES
 */
findIncomeExpenses(filter:string):Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findIncomeExpenses/${filter}`);
}
addSpend(spendDTO:SpendDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/addSpend`, spendDTO);
}
findIncomeExpensesAndDescription(incomeUID:string):Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findIncomeExpensesAndDescription/${incomeUID}`);
}

/***
 * BAR-STOCK-AND-PURCHASE
 */
getStockAndPurchaseByFilter(weekFilter:string):Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/getStockAndPurchaseByFilter/${weekFilter}`);
}
payStockAndPurchase(payStockAndPurchaseDTO:PayStockAndPurchaseDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.barURL}/payStockAndPurchase`, payStockAndPurchaseDTO);
}

findStockPurchaseByUid(stockUID:string):Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.barURL}/findStockPurchaseByUid/${stockUID}`);
}

findRoleByBranch():Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.roleURL}/findRoleByBranch`);
}

/***
 * POS-HOME-DASHBOARD
 */

findBranchDashboard(): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findBranchDashboard`);
}

findRevenueTrend(days: number): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.barURL}/findRevenueTrend/${days}`);
}

findStaffEarnings(): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.barURL}/findStaffEarnings`);
}

/***
 * STOCK - deliveries into the store
 */

addStock(dto: StockReceiptDTO): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/addStock`, dto);
}

/** Bought vs used per service between fromDate and toDate (inclusive). */
findStockMovementPage(params: PageableParam): Observable<ResponsePage<any>> {
  return this.http.post<ResponsePage<any>>(`${this.barURL}/findStockMovementPage`, params);
}

findStockReceipts(serviceUID: string, params: PageableParam): Observable<ResponsePage<any>> {
  return this.http.post<ResponsePage<any>>(`${this.barURL}/findStockReceipts/${serviceUID}`, params);
}

/***
 * BILL CODES - the names bills are opened under (POS Setting)
 */

saveBillCode(code: string): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/saveBillCode`, { code });
}

deleteBillCode(uid: string): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/deleteBillCode/${uid}`, null);
}

/** Every code, each flagged inUse while an unpaid bill holds it. */
findBillCodes(): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.barURL}/findBillCodes`);
}

/** Codes a new bill may be opened under right now. */
findAvailableBillCodes(): Observable<ResponseList<string>> {
  return this.http.get<ResponseList<string>>(`${this.barURL}/findAvailableBillCodes`);
}

/** Ring lines up on an open bill; stock, buckets and the seller's commission move with it. */
addSaleItems(dto: { salesOpenedUID: string; items: { barServiceUID: string; quantity: number }[] }): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/addSaleItems`, dto);
}

/** Correct a store count: REMOVE for a reason, or COUNT to what was found. Units are in the smallest measure. */
adjustStock(dto: { barServiceUID: string; mode: 'REMOVE' | 'COUNT'; units: number; reason?: string; note?: string }): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/adjustStock`, dto);
}

findStockAdjustments(serviceUID: string, params: PageableParam): Observable<ResponsePage<any>> {
  return this.http.post<ResponsePage<any>>(`${this.barURL}/findStockAdjustments/${serviceUID}`, params);
}

/** Settle a bill in one or more payments; they must add up to the bill. */
payBill(dto: { salesOpenedUID: string; payments: { method: string; amount: number; tendered?: number }[] }): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.barURL}/payBill`, dto);
}

/** Lines, payments, totals and who took the money - for the printed receipt. */
findBillReceipt(billUid: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.barURL}/findBillReceipt/${billUid}`);
}
}
