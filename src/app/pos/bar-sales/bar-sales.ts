import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, Title2 } from '../../Utils/component/title2/title2';
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from '@angular/material/icon';
import { FormField } from '../../Utils/models/form-field';
import { ServiceBarMethod } from '../service-bar-method';
import { SaleOpenedDTO, SalesOpened, BarSalesDTO } from '../BarModel';
import { AlertService } from '../../Utils/services/alert';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField, MatLabel, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { SaleDetailsDialogComponent } from '../../Utils/component/sale-details-dialog-component/sale-details-dialog-component';
import { ViewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';


interface PaymentSummary {
  count: number;
  total: number;
}

interface PaymentSummaryDisplay {
  method: string;
  count: number;
  total: number;
}
@Component({
  selector: 'app-bar-sales',
  imports: [
    EmptyStateComponent,
    MatIconModule,
    Title2,
    FormsModule,
    DecimalPipe,
    CommonModule,
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatIconModule,
    MatDatepickerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    TranslatePipe
],
  templateUrl: './bar-sales.html',
  styleUrl: './bar-sales.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSales implements OnInit{
  constructor(
    private visibility: Authentication,
    private barServce: ServiceBarMethod,
    private alertService: AlertService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}
  ngOnInit(): void {
    this.selectedSales='SALES.MANAGE'
        this.salesOpenedListByStatus();
        this.saleDetails = null;
        this.selectedSaleServices = [];
        this.selectedFilter = 'DAY';
  }
  selectedSales = '';
  saleOpenedUID: string = '';
  titleActions: TitleAction[] = [
    {
      icon: 'add',
      title: 'SALES.ADD',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
    {
      icon: 'history',
      title: 'SALES.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.selectedSales = action;
    switch (action) {
      case 'SALES.ADD':
        this.loadBarServices();
        this.loadBarStaff();
        this.salesOpenedListToday();
        this.saleDetails = null;
        this.selectedSaleServices = [];

        break;
      case 'SALES.MANAGE':
        this.salesOpenedListByStatus();
        this.saleDetails = null;
        this.selectedSaleServices = [];
        this.selectedFilter = 'DAY';

        break;
    }
  }

  salesFields: FormField[] = [
    {
      name: 'staffName',
      type: 'select',
      placeholder: 'Enter staff name',
      required: true,
      options: [],
    },
    {
      name: 'barService',
      type: 'checkbox-group',
      placeholder: 'Enter bar service',
      required: true,
      options: [],
    },
  ];

  openSales: FormField[] = [
    {
      name: 'openSaleCode',
      type: 'select',
      placeholder: 'Enter sale code',
      required: true,
      options: [
        { label: 'SK-1', value: 'SK-1' },
        { label: 'SK-2', value: 'SK-2' },
        { label: 'SK-3', value: 'SK-3' },
      ],
    },
  ];
  salesOpenedList: SalesOpened[] = [];
  openNewSales() {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '1200px',
      data: {
        formTitle: 'Open New Sale',
        fields: this.openSales,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const openSaleDTO: SaleOpenedDTO = {
        salesCode: result.openSaleCode,
      };
      console.log('Code', openSaleDTO.salesCode);
      this.barServce.saveOpenSale(openSaleDTO).subscribe({
        next: (res) => {
          if (res.data) {
            console.log('Sales Opened', res.data);
            this.salesOpenedList = [...this.salesOpenedList, res.data];
            this.cdr.detectChanges();
            console.log('Sales Opened UID', this.saleOpenedUID);
          }
        },
        error: (error) => {
          console.error('Error Occurred When Opening New Sale');
        },
      });
    });
  }

  selectedSale: SalesOpened | null = null;
  selectedSaleMore: SalesOpened | null = null;
  selectedSaleServices: any[] = [];
  barSalesUID: string = '';


findBarSalesList(sale: SalesOpened) {
  console.log('SALE SELECTED', sale);

  if (!sale?.uid) {
    console.error('No sale selected');
    return;
  }

  this.selectedSale = sale;
  this.saleOpenedUID = sale.uid;

  this.barServce.findBarSalesList(this.saleOpenedUID).subscribe({
    next: (res) => {
      this.selectedSaleServices = res.data ?? [];

      console.log(
        'Services for sale List:',
        this.selectedSaleServices
      );

      this.openSaleDetailsDialog();
      this.cdr.markForCheck();
    },

    error: (error) => {
      console.error(
        'Error fetching bar sales:',
        error
      );

      this.selectedSaleServices = [];

      // bado unaweza kufungua dialog kuonyesha hakuna services
      this.openSaleDetailsDialog();
      this.cdr.markForCheck();
    },
  });
}

openSaleDetailsDialog() {
  const dialogRef = this.dialog.open(
    SaleDetailsDialogComponent,
    {
      width: '650px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'sale-details-dialog',
      data: {
        sale: this.selectedSale,
        services: this.selectedSaleServices,
        showPayment: true
      },

      autoFocus: false
    }
  );

  dialogRef.afterClosed().subscribe(result => {

    if (!result) {
      return;
    }

    if (result.action === 'PAYMENT') {

      console.log(
        'Payment method:',
        result.paymentMethod
      );

      this.selectedPaymentMethod =
        result.paymentMethod;

      this.proceedToPayment();
    }

    this.cdr.markForCheck();
  });
}


openSaleDetailsDialogForMore(sale: SalesOpened) {

  console.log('SELECTED SALE:', sale);

  this.barServce.findBarSalesList(sale.uid!).subscribe({
    next: (response: any) => {

      console.log('FULL SERVICE RESPONSE:', response);
      console.log('SERVICE DATA:', response.data);

      const services = response.data ?? [];

      console.log('SERVICES TO DIALOG:', services);

      const dialogRef = this.dialog.open(
        SaleDetailsDialogComponent,
        {
          width: '650px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          panelClass: 'sale-details-dialog',

          data: {
            sale: sale,
            services: services,
            showPayment: false
          },

          autoFocus: false
        }
      );

      dialogRef.afterClosed().subscribe(result => {

        if (!result) {
          return;
        }

        this.findBarSalesList(sale);

        if (result.action === 'PAYMENT') {

          console.log(
            'Payment method:',
            result.paymentMethod
          );

          this.selectedPaymentMethod =
            result.paymentMethod;
        }

        this.cdr.markForCheck();
      });
    },

    error: (error) => {
      console.error('FAILED TO LOAD SERVICES:', error);
    }
  });
}




  totalPrice: number = 0;
  getSelectedSaleTotal(): number {
    return this.selectedSaleServices.reduce((total, service) => {
      this.totalPrice = total + (service.price || 0);
      return total + (service.price || 0);
    }, 0);
  }

  selectedPaymentMethod: string = '';
  proceedToPayment(): void {
    if (!this.selectedPaymentMethod) {
      alert('Tafadhali chagua njia ya malipo.');
      return;
    }
    const barSalesDTO: SaleOpenedDTO = {
      paymentMethod: this.selectedPaymentMethod,
      paidAmount: this.getSelectedSaleTotal(),
      uid: this.saleOpenedUID,
      paymentStatus: 'PAID',
    };
    console.log('DTO SENDING TO BACKEND:', barSalesDTO);
    this.barServce.saveOpenSale(barSalesDTO).subscribe({
      next: (res) => {
        console.log('BACKEND RESPONSE:', res);
        if (res.data) {
          console.log('Sale Updated Successfully', res.data);
          this.alertService.show('success', 'Sale updated successfully');
          const index = this.salesOpenedList.findIndex((idx) => idx.uid === res.data.uid);
          if (index !== -1) {
            this.salesOpenedList = this.salesOpenedList.map((item) =>
              item.uid === res.data.uid ? { ...item, ...res.data } : item,
            );

            console.log('UPDATED SALES OPEN:', this.salesOpenedList[index]);

            this.cdr.detectChanges();
          }
        }
      },
      error: (error) => {
        console.error('ERROR STATUS:', error.status);
        console.error('ERROR BODY:', error.error);
        console.error('FULL ERROR:', error);
      },
    });
  }

  saveBarSales(event: any) {
    console.log('UID SELECTED', event);
    if (!event || event.length === 0) {
      console.error('No sale selected');
      return;
    }

    this.saleOpenedUID = event.uid!;
    console.log('UID SELECTED', this.saleOpenedUID);
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '1200px',
      data: {
        formTitle: 'Add New Sale',
        fields: this.salesFields,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const barSalesDTO: BarSalesDTO = {
        paymentMethod: result.paymentMethod,
        barServiceUID: result.barService,
        barStaffUID: result.staffName,
        salesOpenedUID: this.saleOpenedUID,
      };
      console.log('DTO TO SAVE', barSalesDTO);
      this.barServce.saveBarSales(barSalesDTO).subscribe({
        next: (res) => {
          if (res.data) {
            console.log('Sales Recorder', res.data[0].salesOpened);
            const index = this.salesOpenedList.findIndex(
              (idx) => idx.uid === res.data[0].salesOpened.uid,
            );
            if (index !== -1) {
              this.salesOpenedList[index] = res.data[0].salesOpened;
            }
            this.alertService.show('success', 'Bill Saved');
            this.cdr.detectChanges();
            console.log('Sales Opened UID', this.saleOpenedUID);
          }
        },
        error: (error) => {
          console.error('Error Occurred When Opening New Sale');
        },
      });
    });
  }
  onSaleSelected(sale: SalesOpened) {
    console.log('Selected Sale:', sale);
    console.log('UID:', sale.uid);
    console.log('Sales Code:', sale.salesCode);
  }

  loadBarStaff() {
    this.barServce.findBarStaffList().subscribe({
      next: (res) => {
        console.log('Staff Found', res.data);
        const staff = res.data ?? [];
        const staffField = this.salesFields.find((field) => field.name === 'staffName');
        if (staffField) {
          staffField.options = staff.map((item: any) => ({
            label: `${item.firstName} ${item.lastName}`,
            value: item.uid,
          }));
        }
        console.log('Staff Options:', staffField?.options);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error Occurred', error);
      },
    });
  }

  loadBarServices() {
    this.barServce.findBarServiceList().subscribe({
      next: (res) => {
        console.log('Services Found', res.data);
        const services = res.data ?? [];
        const serviceField = this.salesFields.find((field) => field.name === 'barService');
        if (serviceField) {
          serviceField.options = services.map((item: any) => ({
            label: item.serviceName,
            value: item.uid,
          }));
        }
        console.log('Service Options:', serviceField?.options);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error Occurred', error);
      },
    });
  }

  salesOpenedListToday() {
    this.barServce.salesOpenedList().subscribe({
      next: (res) => {
        if (res) {
          this.salesOpenedList = res.data ?? [];
          console.log('Sales For Today', this.salesOpenedList);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error Occurred', error);
      },
    });
  }

  selectedFilter: string = 'DAY';

selectedDate: string = '';

selectedDateObject: Date | null = null;


filters = [
  { label: 'Today', value: 'DAY' },
  { label: 'Yesterday', value: 'YESTERDAY' },
  { label: 'This Week', value: 'WEEK' },
  { label: 'Last Week', value: 'LAST_WEEK' },
  { label: 'This Month', value: 'MONTH' },
  { label: 'Last Month', value: 'LAST_MONTH' },
  { label: 'This Year', value: 'THIS_YEAR' },
  { label: 'Last Year', value: 'LAST_YEAR' },
];

  getSelectedDate(): string {
    if (!this.selectedDate) {
      return this.getTodayDate();
    }
    return this.selectedDate;
  }
displayedFilter(): string {

  switch (this.selectedFilter) {

    case 'DAY':
      return 'Today';

    case 'YESTERDAY':
      return 'Yesterday';

    case 'WEEK':
      return 'This Week';

    case 'LAST_WEEK':
      return 'Last Week';

    case 'MONTH':
      return 'This Month';

    case 'LAST_MONTH':
      return 'Last Month';

    case 'THIS_YEAR':
      return 'This Year';

    case 'LAST_YEAR':
      return 'Last Year';

    case 'SPECIFIC_DATE':
      return this.selectedDate
        ? this.formatDisplayDate(this.selectedDate)
        : 'Selected Date';

    default:
      return 'Today';
  }
}
onSpecificDateChange(): void {

  if (!this.selectedDate) {
    return;
  }

  this.selectedFilter = this.selectedDate;
  this.saleDetails = null;
  this.selectedSaleServices = [];
  this.paymentSummary = [];

  console.log(
    'Selected specific date:',
    this.selectedDate
  );

  this.salesOpenedListByStatus();
}

formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}



openSpecificDatePicker(): void {

  this.selectedFilter = 'SPECIFIC_DATE';

  if (!this.selectedDateObject) {
    this.selectedDateObject = new Date();
  }

  setTimeout(() => {
    this.filterDatePicker.open();
    this.cdr.markForCheck();
  });
}


@ViewChild('filterDatePicker')
  filterDatePicker!: MatDatepicker<Date>;
onSpecificDateSelected(event: any): void {

  const date: Date = event.value;

  if (!date) {
    return;
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  this.selectedDate =
    `${year}-${month}-${day}`;

  this.selectedFilter = 'SPECIFIC_DATE';

  this.saleDetails = null;
  this.selectedSaleServices = [];
  this.paymentSummary = [];

  this.salesOpenedListByStatus();
}

  getSelectedFilter(): string {
    if (!this.selectedFilter) {
      return 'DAY';
    }
    return this.selectedFilter;
  }

selectFilter(value: string): void {

  this.selectedFilter = value;

  // Clear specific date
  this.selectedDate = '';

  // Clear selected sale details
  this.saleDetails = null;

  this.selectedSaleServices = [];

  // Clear payment summary
  this.paymentSummary = [];

  // Reload sales
  this.salesOpenedListByStatus();
}


  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  salesOpenByStatus: any[] = [];
  paymentSummary: {
  method: string;
  count: number;
  total: number;
}[] = [];
totalPaymentAmount: number = 0;


  salesOpenedListByStatus(): void {

    this.barServce.salesOpenedListByStatus(this.getSelectedFilter()).subscribe({
        next: (res) => {
          if (res.data) {
            // Store sales
            this.salesOpenByStatus = res.data;
            console.log( 'Sales Opened by Status:',this.salesOpenByStatus
            );
             // =========================
             // CREATE PAYMENT SUMMARY
             // =========================

            const summary: Record<string, PaymentSummary> =
              this.salesOpenByStatus.reduce(
                (
                  result: Record<string, PaymentSummary>,
                  sale: any
                ) => {
                  const method =sale.paymentMethod?.toLowerCase();
                  if (!method) {
                    return result;
                  }
                  if (!result[method]) {
                    result[method] = {
                      count: 0,
                      total: 0
                    };
                  }
                  result[method].count += 1;
                  result[method].total +=Number(sale.bill || 0);
                  return result;
                },{});
            console.log('Payment Summary Object:',summary);
            // =========================
            // PAYMENT LABELS
            // =========================

            const paymentLabels: Record<string, string> = {
              tigopesa: 'Tigo Pesa',
              airtel: 'Airtel Money',
              airtelmoney: 'Airtel Money',
              mpesa: 'M-Pesa',
              vodacom: 'M-Pesa'
            };


            // =========================
            // CONVERT OBJECT TO ARRAY
            // =========================

            this.paymentSummary =
              Object.entries(summary).map(
                ([method, data]) => ({
                  method:
                  paymentLabels[method] || method,
                  count: data.count,
                  total: data.total
                })
              );
              this.totalPaymentAmount = this.paymentSummary.reduce(
                (total, payment) => total + payment.total,
                0
              );

              console.log('Total Payment Amount:', this.totalPaymentAmount);
              this.cdr.detectChanges();

            console.log(
              'Payment Summary:',
              this.paymentSummary
            );
          }
        },
        error: (error) => {
          console.error(
            'Error Occurred:',
            error
          );

        }

      });

  }

  searchSale() {
    this.salesOpenedListByStatus();
  }
  saleDetails: SalesOpened | null = null;
  onClickSale(sale: SalesOpened) {
    this.selectedSaleServices=[];
    this.saleDetails = sale;
    console.log('Selected Sale:', this.saleDetails);

  }
closeBill(sale: any) {
  console.log('Sales to end:', sale);

  // Remove services belonging to this sale
  this.selectedSaleServices =
    this.selectedSaleServices.filter(
      service => service.salesCode !== sale.salesCode
    );

  // Remove sale from sales list
  this.salesOpenByStatus =
    this.salesOpenByStatus.filter(
      item => item.uid !== sale.uid
    );

  this.cdr.detectChanges();

  console.log('Remaining services:', this.selectedSaleServices);
  console.log('Remaining sales:', this.salesOpenByStatus);
}

formatPaymentMethod(method: string | null | undefined): string {
  if (!method) {
    return 'Not selected';
  }

  const paymentMethods: Record<string, string> = {
    tigopesa: 'T-Pesa',
    mpesa: 'M-Pesa',

    amoney: 'A-Money',
    airtelmoney: 'A-Money',
    'a-money': 'A-Money',

    nmb: 'Nmb',
    crdb: 'Crdb',

    hpesa: 'H-pesa',
    'h-pesa': 'H-pesa',
    halopesa: 'H-pesa',
    'halo pesa': 'H-pesa',

    cash: 'Cash',
    bank: 'Bank'
  };

  const key = method
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  return paymentMethods[key] ||
    (
      method.charAt(0).toUpperCase() +
      method.slice(1).toLowerCase()
    );
}


}
