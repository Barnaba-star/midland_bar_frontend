import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Authentication } from '../../Utils/services/authentication';
import { POS_FULL_ACCESS_ROLES } from '../pos-role.guard';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Title2 } from "../../Utils/component/title2/title2";
import { MatIcon } from "@angular/material/icon";
import { PageableParam } from '../../Utils/models/responces';
import { ServiceBarMethod } from '../service-bar-method';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { PayStockAndPurchaseDTO, SpendDTO, StaffCommissionDTO } from '../BarModel';
import { AlertService } from '../../Utils/services/alert';
import { MatFormField, MatLabel } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SpendDialogComponent } from '../../Utils/component/spend-dialog-component/spend-dialog-component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { error } from 'console';
import { IncomeExpenseDetailsDialogComponent } from '../../Utils/component/income-expense-details-dialog-component/income-expense-details-dialog-component';
import { StockPurchaseDetailsDialogComponent } from '../../Utils/component/dialogs/stock-purchase-details-dialog-component/stock-purchase-details-dialog-component';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';





@Component({
  selector: 'app-bar-reports',
  standalone: true,
  imports: [
    EmptyStateComponent,Title2, MatIcon, CommonModule, FormsModule, CdkConnectedOverlay, CdkOverlayOrigin, MatFormField, MatLabel, FormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe],
  templateUrl: './bar-reports.html',
  styleUrl: './bar-reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarReports implements OnInit{
[x: string]: any;

  constructor(
    private visibility: Authentication, private barService:ServiceBarMethod, private cdr:ChangeDetectorRef, private alert:AlertService, private dialog:MatDialog
  ) { }
  ngOnInit(): void {
    // Open on the first tab this role can actually see: CEO and above land
    // on Service as before, MANAGER/CASHIER (who can't see Service) land on
    // Staff.
    const visible = this.getTitled(this.titleActions).map(action => action.title);
    const defaultTab = ['REPORTS.SERVICE', 'REPORTS.STAFF'].find(tab => visible.includes(tab)) ?? visible[0];
    if (defaultTab) {
      this.onAction(defaultTab);
    }
  }
  selectedReport = '';
  // Who sees which tab inside Report ("Matumizi" for MANAGER/CASHIER):
  //   CEO     -> every tab
  //   MANAGER -> Staff report + Store + Stock & Purchase
  //   CASHIER -> Staff report + Store
  // Frontend visibility only - the backend @PreAuthorize checks are the
  // real security boundary.
  private readonly fullAccessRoles = POS_FULL_ACCESS_ROLES;
  titleActions: TitleAction[] = [
         {
      icon: 'stock',
      title: 'REPORTS.STOCK',
      roles: [...this.fullAccessRoles, 'MANAGER']
    },
       {
      icon: 'payment2',
      title: 'REPORTS.INCOME',
      roles: this.fullAccessRoles
    },
      {
      icon: 'store',
      title: 'REPORTS.STORE',
      roles: [...this.fullAccessRoles, 'MANAGER', 'CASHIER']
    },
    {
      icon: 'person2',
      title: 'REPORTS.STAFF',
      roles: [...this.fullAccessRoles, 'MANAGER', 'CASHIER']
    },
    {
      icon: 'service',
      title: 'REPORTS.SERVICE',
      roles: this.fullAccessRoles
    },

  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }



 onAction(action: string): void {
  console.log('ACTION RECEIVED:', action);

  this.selectedReport = action;

  switch (action) {

    case 'REPORTS.SERVICE':
      console.log('Open Service');

      this.filter = 'DAY';
      this.findBarRevenueReport();
      this.findBarRevenueByService();

      break;

    case 'REPORTS.STAFF':
      console.log('Open Staff');
      this.filterCommissions('TODAY');

      break;

    case 'REPORTS.STORE':
      console.log('Open Store');
      this.findServiceAndStoreReportPage();

      break;

        case 'REPORTS.INCOME':
      this.selectIncomeExpenseFilter('THIS_WEEK');

      break;
      case 'REPORTS.STOCK':
      this.getStockAndPurchaseByFilter('THIS_WEEK');

      break;

    default:
      console.log('UNKNOWN ACTION:', action);
      break;
  }
}



  pageableParam: PageableParam = {
    page: 0,
    size: 100,
    date: new Date(),
    filter: this.getSelectedFilter()
  };
  currentPage: number = 0;
pageSize: number = 5;

totalElements: number = 0;
totalPages: number = 0;

// Rebuilt whenever totalPages changes. The template used to call
// [].constructor(totalPages), which allocated a fresh array on every
// change detection pass and so could never be tracked.
pageNumbers: number[] = [];

isLoading: boolean = false;


  barReports: any[] = [];
 filteredReports: any[] = [];
 allBarReports: any[] = [];
 reportForToday:Boolean=false;


  displayedColumns: string[] = [
    'sn',
    'customer',
    'service',
    'price',
    'breakdown',
    'payment',
    'status',
    'bookingDate'
  ];

  searchText: string = '';
  filter: string = ''
  getSelectedFilter(): string {
  return this.filter || 'TODAY';
}
dayBarReport(){
  this.filter='DAY';
   this.findBarRevenueReport();
   this.findBarRevenueByService();
}
yestadayBarReport(){
  this.filter='YESTERDAY';
   this.findBarRevenueReport();
   this.findBarRevenueByService();
}
weekBarReport(){
  this.filter='WEEK';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}

lastWeekBarReport(){
  this.filter='LAST_WEEK';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}
monthBarReport(){
  this.filter='MONTH';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}
lastMonthBarReport(){
  this.filter='LAST_MONTH';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}
yearBarReport(){
  this.filter='THIS_YEAR';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}
lastYearBarReport(){
  this.filter='LAST_YEAR';
   this.findBarRevenueReport();
      this.findBarRevenueByService();
}


selectedDate: Date | null = null;

onDateSelected(): void {
  if (!this.selectedDate) return;

  this.filter = [
    this.selectedDate.getFullYear(),
    String(this.selectedDate.getMonth() + 1).padStart(2, '0'),
    String(this.selectedDate.getDate()).padStart(2, '0')
  ].join('-');

  this.findBarRevenueReport();
  this.findBarRevenueByService();
}



getReport(date: string): void {
  console.log('Getting report for:', date);
}

getCurrentYear(): number {
  return new Date().getFullYear();
}
getCurrentMonth(): string {
const date = new Date();

  date.setMonth(date.getMonth());

  return date.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric'
  }).toUpperCase() ;
}

getCurrentWeek(): number {
  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  const pastDaysOfYear = (currentDate.valueOf() - startOfYear.valueOf()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}
getLastMonthReportLabel(): string {
  const date = new Date();

  date.setMonth(date.getMonth() - 1);

  return date.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric'
  }).toUpperCase() ;
}


findBarReportsPage(): void {
  this.reportForToday=false;
  this.isLoading = true;
  this.pageableParam = {
    page: this.currentPage,
    size: this.pageSize,
    filter: this.getSelectedFilter()
  };

  this.barService.findCurrentBarReportsPage(this.pageableParam).subscribe({

    next: (response: any) => {

      console.log('Bar reports:', response);
      this.barReports = response.data || [];

      this.filteredReports = [...this.barReports];

      this.totalElements =
        response.totalElements ??
        response.total ??
        response.totalCount ??
        0;

      this.totalPages =
        response.totalPages ??
        Math.ceil(this.totalElements / this.pageSize);
      this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i);

      this.isLoading = false;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Failed to fetch bar reports',
        error
      );

      this.barReports = [];
      this.filteredReports = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.pageNumbers = [];
      this.isLoading = false;

      this.cdr.markForCheck();
    }

  });
}


  searchReports(): void {
    const search = this.searchText
      .trim()
      .toLowerCase();
    if (!search) {
      this.filteredReports = [...this.barReports];
      return;
    }

    this.filteredReports = this.barReports.filter(report => {
      const customerName = `
        ${report.firstName || ''}
        ${report.middleName || ''}
        ${report.lastName || ''}
      `.toLowerCase();
      const serviceName =
        `${report.serviceName || ''}`.toLowerCase();
      const serviceCode =
        `${report.serviceCode || ''}`.toLowerCase();
      const paymentMethod =
        `${report.paymentMethod || ''}`.toLowerCase();
      const status =
        `${report.status || ''}`.toLowerCase();
      return (
        customerName.includes(search) ||
        serviceName.includes(search) ||
        serviceCode.includes(search) ||
        paymentMethod.includes(search) ||
        status.includes(search)
      );
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.filteredReports = [...this.barReports];
  }

  getCustomerName(report: any): string {

    return [
      report.firstName,
      report.middleName,
      report.lastName
    ]
      .filter(value => value)
      .join(' ');
  }

  formatAmount(amount: any): string {

    const value = amount === null || amount === undefined ? 0 : Number(amount);

    return `Tshs ${value.toLocaleString('en-TZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  getTotalAmount(report: any): number {

    if (report.totalAmount !== null &&
        report.totalAmount !== undefined) {

      return Number(report.totalAmount);
    }

    return Number(report.price || 0);
  }
  expandedReport: any = null;

toggleBreakdown(report: any): void {
  if (this.expandedReport === report) {
    this.expandedReport = null;
  } else {
    this.expandedReport = report;
  }
}

getRevenueTotal(field: string): number {
  return this.barReports.reduce((total, report) => {
    return total + Number(report[field] || 0);
  }, 0);
}

getTotalRevenue(): number {
  return this.barReports.reduce((total, report) => {
    return total + this.getTotalAmount(report);
  }, 0);
}

goToPage(page: number): void {

  if (
    page < 0 ||
    page >= this.totalPages ||
    page === this.currentPage
  ) {
    return;
  }

  this.currentPage = page;

  this.findBarReportsPage();

  // Close opened breakdown
  this.expandedReport = null;
}


previousPage(): void {

  if (this.currentPage > 0) {

    this.currentPage--;

    this.findBarReportsPage();

    this.expandedReport = null;
  }
}


nextPage(): void {

  if (this.currentPage < this.totalPages - 1) {
    this.currentPage++;
    this.findBarReportsPage();
    this.expandedReport = null;
  }
}


changePageSize(size: number): void {
  this.pageSize = Number(size);
  this.currentPage = 0;
  this.findBarReportsPage();
}


getEndRecord(): number {
  return Math.min(
    (this.currentPage + 1) * this.pageSize,
    this.totalElements
  );
}

getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

revenueReportToday: any = null;
revenueByService: any[] = [];


findBarRevenueReport(): void {
  this.reportForToday = true;
  this.barReports=[];
  this.barService.findCurrentBarRevenueReport(this.getSelectedFilter()).subscribe({
    next: (response: any) => {

      console.log(
        'Bar Revenue Report:',
        response
      );
      this.revenueReportToday = response.data;
      this.findBarRevenueByService();
      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Failed to fetch bar revenue report',
        error
      );

      this.revenueReportToday = null;

      this.cdr.markForCheck();
    }

  });
}


findBarRevenueByService(): void {
  this.barService.findCurrentBarRevenueByService(this.getSelectedFilter()).subscribe({

    next: (response: any) => {

      console.log(
        'Revenue By Service:',
        response
      );

      this.revenueByService = response.data || [];

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Failed to fetch revenue by service',
        error
      );

      this.revenueByService = [];

      this.cdr.markForCheck();
    }

  });
}

getTodayRevenueTotal(): number {
  if (!this.revenueReportToday) {
    return 0;
  }

  return (
    Number(this.revenueReportToday.staffAmount || 0) +
    Number(this.revenueReportToday.ownerAmount || 0) +
    Number(this.revenueReportToday.traAmount || 0) +
    Number(this.revenueReportToday.emergencyAmount || 0) +
    Number(this.revenueReportToday.maintenanceAmount || 0) +
    Number(this.revenueReportToday.rentAmount || 0) +
    Number(this.revenueReportToday.loanAmount || 0) +
    Number(this.revenueReportToday.lukuAmount || 0) +
    Number(this.revenueReportToday.waterAmount || 0) +
    Number(this.revenueReportToday.stockPurchaseAmount || 0) +
    Number(this.revenueReportToday.othersAmount || 0)
  );
}

getServiceTotal(service: any): number {
  return (
    Number(service.staffAmount || 0) +
    Number(service.ownerAmount || 0) +
    Number(service.traAmount || 0) +
    Number(service.emergencyAmount || 0) +
    Number(service.maintenanceAmount || 0) +
    Number(service.rentAmount || 0) +
    Number(service.loanAmount || 0) +
    Number(service.lukuAmount || 0) +
    Number(service.waterAmount || 0) +
    Number(service.stockPurchaseAmount || 0) +
    Number(service.othersAmount || 0)
  );
}



/**
 * ******************************************************************************************* STAFF METHODS*****************************************************************
 */
localDate: string = 'THIS_WEEK';
getLocalDate(): string {
  if (!this.localDate) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.localDate = `${year}-${month}-${day}`;
  }

  return this.localDate;
}
filterByDate(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.value) {
    return;
  }
  this.date = input.value;
  const [year, month, day] = input.value.split('-');
  // Format: 01-2-2026
  const formattedDate = `${day}-${Number(month)}-${year}`;
  this.selectedRange = formattedDate;
  this.filterCommissions(formattedDate);
}
pageC = 0;
sizeC = 5;

selectedRange = 'TODAY';
date = '';

totalElementsC = 0;
totalPagesC = 0;

commissionReports: any[] = [];

filterCommissions(range: string) {
  this.selectedRange = range;

  const params: PageableParam = {
    page: this.pageC,
    size: this.sizeC,
    filter: this.selectedRange
  };

  console.log('REQUEST PARAMS:', params);

  this.barService
    .findStaffCommissionPage(params)
    .subscribe({
      next: (res) => {

        console.log('API RESPONSE:', res);

        this.commissionReports = res.data ?? [];

        this.totalElementsC = res.totalElements ?? 0;
        this.totalPagesC = res.totalPages ?? 0;

        console.log(
          'COMMISSION REPORTS:',
          this.commissionReports
        );

        console.log(
          'TOTAL ELEMENTS:',
          this.totalElementsC
        );

        console.log(
          'TOTAL PAGES:',
          this.totalPagesC
        );

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Error Occurred:', error);

        this.commissionReports = [];
        this.totalElementsC = 0;
        this.totalPagesC = 0;

        this.cdr.detectChanges();
      }
    });
}
nextCommissionPage() {
  if (this.pageC < this.totalPagesC - 1) {
    this.pageC++;
    this.filterCommissions(this.selectedRange);
  }
}

previousCommissionPage() {
  if (this.pageC > 0) {
    this.pageC--;
    this.filterCommissions(this.selectedRange);
  }
}

getStartIndex(): number {
  return (this.pageC * this.sizeC) + 1;
}

getEndIndex(): number {
  return Math.min(
    (this.pageC + 1) * this.sizeC,
    this.totalElementsC
  );
}

getTotalCommission(): number {
  return this.commissionReports.reduce(
    (total, item) => total + Number(item.totalAmount || 0),
    0
  );
}

getPaidCommission(): number {
  return this.commissionReports.reduce(
    (total, item) => total + Number(item.paidAmount || 0),
    0
  );
}

getRemainingCommission(): number {
  return this.commissionReports.reduce(
    (total, item) => total + Number(item.remainingAmount || 0),
    0
  );
}

getSelectedRangeLabel(): string {
  if (!this.selectedRange) {
    return 'Today';
  }

  const labels: { [key: string]: string } = {
    TODAY: 'Today',
    YESTERDAY: 'Yesterday',
    THIS_WEEK: 'This Week',
    LAST_WEEK: 'Last Week',
    THIS_MONTH: 'This Month',
    LAST_MONTH: 'Last Month',
    THIS_YEAR: 'This Year',
    LAST_YEAR: 'Last Year'
  };

  // If it is a predefined range
  if (labels[this.selectedRange]) {
    return labels[this.selectedRange];
  }

  // If it is a specific date e.g. 05-8-2026
  return this.selectedRange;
}

viewCommissionReport(report: any) {
  console.log('VIEW COMMISSION:', report);

  // fungua modal/dialog hapa
}

payCommission(report: any) {
  console.log('PAY COMMISSION:', report);

  // payment logic hapa
}



paymentOverlayOpen = false;
paymentAmount = 0;
paymentReport: any = null;
overlayOrigin!: CdkOverlayOrigin;
firstName:string=''
middleName:string=''
lastName:string=''
filterDate:string=''
remainingAmount:number=0
weekDate: string = new Date().toISOString().split('T')[0];
descriptions:string=''



openPaymentOverlay(report: any, origin: CdkOverlayOrigin): void {
  this.paymentReport = report;
  this.paymentAmount = report.amount;
  this.firstName = report.firstName;
  this.middleName = report.middleName;
  this.lastName = report.lastName;
  this.filterDate = this.selectedDateFilter;
  this.remainingAmount = report.remainingAmount;
  this.overlayOrigin = origin;
  this.paymentOverlayOpen = true;
  this.weekDate = report.weekDate;

  // Reset description kila unapofungua overlay
  this.descriptions = '';
}

closePaymentOverlay(): void {
  this.paymentOverlayOpen = false;
  this.paymentReport = null;
  this.descriptions = '';
}


submitPayment(): void {

  const staffCommissionDTO: StaffCommissionDTO = {
    uid: this.paymentReport.uid,
    amount: this.paymentAmount,
    filter: this.selectedRange,
    weekDate: this.weekDate,
    descriptions: this.descriptions.trim()
  };

  console.log('Staff Commissions', staffCommissionDTO);

  this.barService.payStaffCommission(staffCommissionDTO).subscribe({
    next: (res) => {

      if (res.data) {

        console.log('Updated data', res.data);

        this.alert.show(
          'success',
          'Payment Successfully'
        );

        const index = this.commissionReports.findIndex(
          idx => idx.uid === res.data.uid
        );

        if (index !== -1) {

          this.commissionReports[index] = res.data;

          this.commissionReports[index].uid = res.data.uid;
          this.commissionReports[index].firstName =
            res.data.barStaff.firstName;
          this.commissionReports[index].date =
            res.data.updatedAt;
          this.commissionReports[index].middleName =
            res.data.barStaff.middleName;
          this.commissionReports[index].lastName =
            res.data.barStaff.lastName;
          this.commissionReports[index].barCategory =
            res.data.barStaff.barCategory;
          this.commissionReports[index].remainingAmount =
            res.data.remainingAmount;
          this.commissionReports[index].totalAmount =
            res.data.totalAmount;
          this.commissionReports[index].paidAmount =
            res.data.payedAmount;
          this.commissionReports[index].status =
            res.data.paymentStatus;

          this.cdr.detectChanges();
        }
      }
    },

    error: (error) => {
      console.error(
        'Error Occurred when saving Staff Commission',
        error
      );

      this.alert.show(
        'error',
        'Error Occurred when saving'
      );
    }
  });

  this.closePaymentOverlay();
}





searchStatus: any = 'CLOSED';
serviceEntityUIDS: string[] = [];
storeOpenList:any[]=[];
findServiceEntityUIDList(): void {
  this.barService.findServiceEntityUIDList(this.searchStatus).subscribe({
    next: (res) => {
      console.log('Store Open:', res.data);
      if (res?.data?.length > 0) {
        this.storeOpenList = res.data;
        this.serviceEntityUIDS = res.data
          .map((item: any) => item.barServiceEntityUID)
          .filter((uid: string) => !!uid);
        this.cdr.detectChanges();
        console.log('Store Open List:', this.storeOpenList);
        console.log('Service Entity UIDs:', this.serviceEntityUIDS);
      } else {
        this.storeOpenList = [];
        this.serviceEntityUIDS = [];
        console.log('No open stores found');
        this.cdr.markForCheck();
      }
    },
    error: (error) => {
      console.error(
        'Error Occurred when fetching Service Entity UIDs',
        error
      );

      this.storeOpenList = [];
      this.serviceEntityUIDS = [];
      this.alert.show(
        'error',
        'Error Occurred when fetching Service Entity UIDs'
      );

      this.cdr.markForCheck();
    }
  });
}


/**
 * ******************************************************************************************* STORE METHODS *****************************************************************
 */
searchParam: string = 'DAY';

page: number = 0;
size: number = 10;

serviceAndStoreReports: any[] = [];

selectedDateFilter: string = 'DAY';

showCustomDate = false;

customStartDate = '';
customEndDate = '';
closedStoreCount = 0;

reportOpenedDate: any = null;
reportClosedDate: any = null;
@ViewChild('dateInput') dateInput!: ElementRef<HTMLInputElement>;


openDatePicker(): void {
  this.dateInput.nativeElement.showPicker();
}

onDateSelectedD(date: string): void {
  console.log('Selected date:', date);
  this.selectedDateFilter = date;
  this.findServiceAndStoreReportPage();
}findServiceAndStoreReportPage(): void {
  const params: PageableParam = {
    page: this.page,
    size: this.size,
    searchParam: this.selectedDateFilter || this.searchParam
  };

  this.barService.findServiceAndStoreReportPage(params).subscribe({
    next: (response) => {

      // =========================
      // PAGINATION
      // =========================

      this.serviceAndStoreReports = response.data || [];

      this.totalElements = response.totalElements || 0;
      this.totalPages = response.totalPages || 0;

      // =========================
      // CLOSED STORE COUNT
      // =========================

      this.closedStoreCount =
        this.serviceAndStoreReports.filter(
          row => row.status === 'CLOSED'
        ).length;

      // =========================
      // OPENED DATE RANGE
      // =========================

      const openedDates = this.serviceAndStoreReports
        .map(row => row.openedDate)
        .filter(date => date);

      if (openedDates.length > 0) {
        this.reportOpenedDate = new Date(
          Math.min(
            ...openedDates.map(
              date => new Date(date).getTime()
            )
          )
        );
      } else {
        this.reportOpenedDate = null;
      }

      // =========================
      // CLOSED DATE RANGE
      // =========================

      const closedDates = this.serviceAndStoreReports
        .map(row => row.closedDate)
        .filter(date => date);

      if (closedDates.length > 0) {
        this.reportClosedDate = new Date(
          Math.max(
            ...closedDates.map(
              date => new Date(date).getTime()
            )
          )
        );
      } else {
        this.reportClosedDate = null;
      }

      this.cdr.detectChanges();

      console.log(
        'Page:', this.page,
        'Size:', this.size,
        'Total Elements:', this.totalElements,
        'Total Pages:', this.totalPages,
        this.serviceAndStoreReports,
        'Service And Store Report'
      );
    },

    error: (error) => {
      console.error(
        'Failed to fetch service and store report:',
        error
      );
    }
  });
}

nextPageNext(): void {
  if (this.page < this.totalPages - 1) {
    this.page++;
    this.findServiceAndStoreReportPage();
  }
}

previousPagePre(): void {
  if (this.page > 0) {
    this.page--;
    this.findServiceAndStoreReportPage();
  }
}



selectDateFilter(filter: string): void {
  this.selectedDateFilter = filter;
  this.searchParam = filter;

  this.page = 0;

  this.showCustomDate = false;

  this.findServiceAndStoreReportPage();
}

getSelectedStoreDateLabel(): string {
  const labels: { [key: string]: string } = {
    DAY: 'Today',
    YESTERDAY: 'Yesterday',
    WEEK: 'This Week',
    LAST_WEEK: 'Last Week',
    MONTH: 'This Month',
    LAST_MONTH: 'Last Month',
    THIS_YEAR: 'This Year',
    LAST_YEAR: 'Last Year',
  };

  if (!this.selectedDateFilter) {
    return 'Today';
  }

  return labels[this.selectedDateFilter] || this.selectedDateFilter;
}


calculateSharedCommission(
  commissionAmount: number,
  totalPrice: number,
  sharedAmount: number
): number {
  if (!totalPrice || !sharedAmount) {
    return 0;
  }

  return (commissionAmount * sharedAmount) / totalPrice;
}


/**
 * ******************************************************************************************* INCOME AND EXPENSES METHODS *****************************************************************
 */
filterWeek: string = 'THIS_WEEK';

incomeExpenses: any[] = [];


selectIncomeExpenseFilter(filter: string): void {

  this.filterWeek = filter;

  this.barService
    .findIncomeExpenses(filter)
    .subscribe({

      next: (response) => {

        console.log(
          'Income Expenses:',
          response
        );

        this.incomeExpenses =response?.data ?? [];
        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(
          'Error fetching income expenses:',
          error
        );

        this.incomeExpenses = [];

        this.cdr.markForCheck();

      }

    });
}


getTotalIncome(): number {

  return this.incomeExpenses.reduce(
    (total, item) =>
      total + Number(item.income || 0),
    0
  );

}


getTotalExpenses(): number {

  return this.incomeExpenses.reduce(
    (total, item) =>
      total + Number(item.expenses || 0),
    0
  );

}


getNetBalance(): number {

  return (
    this.getTotalIncome()
    -
    this.getTotalExpenses()
  );

}

spendIncomeExpense(item: any): void {
  const dialogRef = this.dialog.open(SpendDialogComponent, {
    width: '600px',
    maxWidth: '95vw',
    data: item
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log('Spend result:', result);
      const spendDTO:SpendDTO={
        description:result.description,
        amount:result.amount,
        uid:result.uid
      }
      this.barService.addSpend(spendDTO).subscribe({
        next:(res)=>{
          if(res.data){
            console.log('Updated Data', res.data);
            this.alert.show('success', 'Success Spend Added')
            const index = this.incomeExpenses.findIndex(idx=>idx.uid === res.data.uid);
            if(index !==-1){
              this.incomeExpenses[index] = res.data
              this.cdr.detectChanges();
            }
          }
        },
        error:(error)=>{
          console.log('Error', error)
          this.alert.show('error', 'Error in saving spend')
        }
      })
    }
  });
}
detailsForIncomeExpenses(item: any): void {

  this.barService
    .findIncomeExpensesAndDescription(item.uid)
    .subscribe({

      next: (res) => {

        if (res.data) {

          console.log(
            'Income and Descriptions',
            res.data
          );

          this.dialog.open(
            IncomeExpenseDetailsDialogComponent,
            {
              width: '850px',
              maxWidth: '95vw',
              maxHeight: '90vh',

              data: res.data
            }
          );

        }

      },

      error: (error) => {

        console.error(
          'Error',
          error
        );

      }

    });

}


stockAndPurchaseReports: any[] = [];
stockSelectedFilter = '';

getStockAndPurchaseByFilter(filter: string): void {
  this.stockSelectedFilter = filter;

  this.barService
    .getStockAndPurchaseByFilter(filter)
    .subscribe({
      next: (res) => {
        this.stockAndPurchaseReports = res.data ?? [];
        this.cdr.detectChanges();
        console.log('FILTER:', filter);
        console.log('RESPONSE:', res);
        console.log('STOCK DATA:', this.stockAndPurchaseReports);
      },

      error: (error) => {
        console.error('Error occurred', error);
        this.stockAndPurchaseReports = [];
        this.cdr.markForCheck();
      }
    });
}

getStockTotalAmount(): number {

  return this.stockAndPurchaseReports.reduce(
    (total, item) =>
      total + (item.totalAmount ?? 0),
    0
  );

}


getStockPaidAmount(): number {

  return this.stockAndPurchaseReports.reduce(
    (total, item) =>
      total + (item.payedAmount ?? 0),
    0
  );

}


getStockRemainingAmount(): number {

  return this.stockAndPurchaseReports.reduce(
    (total, item) =>
      total + (item.remainingAmount ?? 0),
    0
  );

}

getStockSelectedRangeLabel(): string {

  switch (this.stockSelectedFilter) {

    case 'THIS_WEEK':
      return 'This Week';

    case 'LAST_WEEK':
      return 'Last Week';

    case 'THIS_MONTH':
      return 'This Month';

    case 'LAST_MONTH':
      return 'Last Month';

    case 'THIS_YEAR':
      return 'This Year';

    case 'LAST_YEAR':
      return 'Last Year';

    default:
      return 'This Week';
  }

}
selectedStockPurchase: any = null;

stockPaymentAmount: number | null = null;

stockPaymentDescription:string='';

stockPaymentDialogRef?: MatDialogRef<any>;
@ViewChild('stockPaymentDialog')
stockPaymentDialog!: TemplateRef<any>;


viewStockPurchaseDetails(stock: any): void {

  console.log('STOCK DATA:', stock);

  this.barService
    .findStockPurchaseByUid(stock.uid)
    .subscribe({

      next: (res) => {

        console.log(
          'STOCK PURCHASE DETAILS:',
          res
        );

        if (!res?.data) {

          this.alert.show(
            'error',
            'No stock purchase details found'
          );

          return;
        }


        /*
         * res.data inaweza kuwa:
         *
         * [
         *   {
         *      uid: "...",
         *      serviceName: "KUNYOA",
         *      ...
         *   }
         * ]
         *
         */


        const details = Array.isArray(res.data)
          ? res.data
          : [res.data];


        console.log(
          'DETAILS TO DIALOG:',
          details
        );


        this.dialog.open(
          StockPurchaseDetailsDialogComponent,
          {

            width: '900px',

            maxWidth: '95vw',

            maxHeight: '90vh',

            autoFocus: false,

            data: {

              stock: stock,

              details: details

            }

          }
        );

      },


      error: (error) => {

        console.error(
          'Error fetching stock purchase details:',
          error
        );


        this.alert.show(
          'error',
          'Error fetching stock purchase details'
        );

      }

    });

}


payStockPurchase(stock: any): void {

  this.selectedStockPurchase = stock;

  this.stockPaymentAmount = null;

  this.stockPaymentDescription = '';

  this.stockPaymentDialogRef = this.dialog.open(
    this.stockPaymentDialog,
    {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: true,
      panelClass: 'stock-payment-dialog-panel'
    }
  );

  this.stockPaymentDialogRef.afterClosed().subscribe(() => {

    this.selectedStockPurchase = null;

    this.stockPaymentAmount = null;

    this.stockPaymentDescription = '';

    this.cdr.markForCheck();

  });
}

submitStockPayment(): void {

  if (!this.selectedStockPurchase) {
    return;
  }

  const amount = Number(this.stockPaymentAmount ?? 0);

  const remainingAmount =
    Number(this.selectedStockPurchase.remainingAmount ?? 0);

  if (amount <= 0) {
    return;
  }

  if (amount > remainingAmount) {
    return;
  }

  const request = {
    stockAndPurchaseUid: this.selectedStockPurchase.uid,
    amount: amount,
    description: this.stockPaymentDescription?.trim(),
    weekDate: this.selectedStockPurchase.weekDate
  };
  this.closeStockPaymentDialog();
  const payStockAndPurchaseDTO:PayStockAndPurchaseDTO={
    uid:request.stockAndPurchaseUid,
    weekDate:request.weekDate,
    description:request.description,
    amount:request.amount
  }

  this.barService.payStockAndPurchase(payStockAndPurchaseDTO).subscribe({
    next:(res)=>{
      if(res.data){
      const index = this.stockAndPurchaseReports.findIndex(index=>index.uid===res.data.uid);
      this.stockAndPurchaseReports[index]=res.data;
      this.cdr.detectChanges();
      this.alert.show('success', 'Payed Success')
      console.log('PAY STOCK PURCHASE:', res.data);
      }
    },
    error:(error)=>{
      console.log('ERROR:', error);
    }
  })
}

closeStockPaymentDialog(): void {
  this.stockPaymentDialogRef?.close();
}


}
