import { PaymentNoteDialog } from '../../Utils/component/dialogs/payment-note-dialog/payment-note-dialog';
import { SellableItems } from '../../Utils/services/sellable-items';
import { OfflineService } from '../../Utils/offline/offline.service';
import { StaffLossDialog } from '../../Utils/component/dialogs/staff-loss-dialog/staff-loss-dialog';
import { BillNicknames } from '../../Utils/services/bill-nicknames';
import { ShiftBar, ShiftState } from '../shift-bar/shift-bar';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleAction, Title2 } from '../../Utils/component/title2/title2';
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from '@angular/material/icon';
import { FormField } from '../../Utils/models/form-field';
import { ServiceBarMethod } from '../service-bar-method';
import { SaleOpenedDTO, SalesOpened, BarSalesDTO } from '../BarModel';
import { AlertService } from '../../Utils/services/alert';
import { MatDialog } from '@angular/material/dialog';
import { SaleItemDialogComponent, SaleItemResult } from '../../Utils/component/dialogs/sale-item-dialog-component/sale-item-dialog-component';
import { PayBillDialogComponent, PayBillResult } from '../../Utils/component/dialogs/pay-bill-dialog-component/pay-bill-dialog-component';
import { ReceiptDialogComponent } from '../../Utils/component/dialogs/receipt-dialog-component/receipt-dialog-component';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField, MatLabel, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { SaleDetailsDialogComponent } from '../../Utils/component/sale-details-dialog-component/sale-details-dialog-component';
import { ViewChild } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    ShiftBar,
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
    private translate: TranslateService,
  ) {}
  ngOnInit(): void {
    // Have what selling needs on the device before the internet drops.
    this.offline.warmUp();
    // The add-item list, loaded before the first tap.
    this.sellable.prefetch();
    // Sales made offline have reached the server: show its list again.
    this.offline.synced.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.selectedSales === 'SALES.ADD') {
        this.salesOpenedListToday();
      }
    });
    // Selling is what this page is opened for: start on New Sale, not History.
    this.onAction('SALES.ADD');
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
      label: 'SALES_FLOW.CODE',
      placeholder: 'SALES_FLOW.CODE',
      required: true,
      // Filled each time from the codes no unpaid bill is holding.
      options: [],
    },
  ];
  salesOpenedList: SalesOpened[] = [];

  /*
   * Filter the open bills by whose they are: 'ALL', a staff code from Staff
   * Sell (K1), 'U:<login>' for bills a manager/CEO/root opened here on the
   * Sales page, or 'NONE' for old bills nobody is recorded against.
   */
  staffFilter = 'ALL';
  /** Open bill is off until the login's shift is open. */
  shiftState: ShiftState | null = null;
  /** This device's nicknames for open bills - never saved to the backend. */
  readonly nicknames = inject(BillNicknames);
  private offline = inject(OfflineService);
  private sellable = inject(SellableItems);
  private destroyRef = inject(DestroyRef);

  /** The staff with open bills, for the filter chips - code, name and how many bills. */
  get staffOptions(): { code: string; name: string; count: number }[] {
    const byCode = new Map<string, { code: string; name: string; count: number }>();
    for (const bill of this.salesOpenedList) {
      if (!bill.staffCode) continue;
      const entry = byCode.get(bill.staffCode) ?? { code: bill.staffCode, name: bill.staffName ?? '', count: 0 };
      entry.count++;
      byCode.set(bill.staffCode, entry);
    }
    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }

  /** Whoever opened bills here at the till (no staff member on them), for their own chips. */
  get openerOptions(): { key: string; name: string; count: number }[] {
    const byLogin = new Map<string, { key: string; name: string; count: number }>();
    for (const bill of this.salesOpenedList) {
      if (bill.staffCode || !bill.openedBy) continue;
      const key = 'U:' + bill.openedBy;
      const entry = byLogin.get(key) ?? { key, name: bill.openedByName || bill.openedBy, count: 0 };
      entry.count++;
      byLogin.set(key, entry);
    }
    return [...byLogin.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get unassignedCount(): number {
    return this.salesOpenedList.filter((b) => !b.staffCode && !b.openedBy).length;
  }

  /** The name a bill goes by: its staff member, else whoever opened it at the till. */
  billOwner(bill: SalesOpened): string {
    if (bill.staffCode) {
      return `${bill.staffCode} · ${bill.staffName ?? ''}`;
    }
    return bill.openedByName || bill.openedBy || '';
  }

  /** A staff member's chip is chosen (not ALL / NONE / someone who opened bills at the till). */
  get staffChipChosen(): boolean {
    return this.staffFilter !== 'ALL' && this.staffFilter !== 'NONE' && !this.staffFilter.startsWith('U:');
  }

  get visibleBills(): SalesOpened[] {
    if (this.staffFilter === 'ALL') return this.salesOpenedList;
    if (this.staffFilter === 'NONE') return this.salesOpenedList.filter((b) => !b.staffCode && !b.openedBy);
    if (this.staffFilter.startsWith('U:')) {
      const login = this.staffFilter.slice(2);
      return this.salesOpenedList.filter((b) => !b.staffCode && b.openedBy === login);
    }
    return this.salesOpenedList.filter((b) => b.staffCode === this.staffFilter);
  }

  setStaffFilter(filter: string): void {
    this.staffFilter = filter;
    this.cdr.markForCheck();
  }

  openNewSales() {
    // Only codes set up in POS Setting that no unpaid bill is holding.
    this.barServce.findAvailableBillCodes().subscribe({
      next: (res) => {
        const codes = res.data ?? [];
        if (codes.length === 0) {
          this.alertService.show('error', this.translate.instant('SALES_FLOW.NO_FREE_CODE'));
          return;
        }
        this.openSales[0].options = codes.map((code) => ({ label: code, value: code }));
        this.openBillDialog();
      },
      error: (err) => console.error('Error loading bill codes:', err),
    });
  }

  private openBillDialog() {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        formTitle: 'SALES_FLOW.OPEN_TITLE',
        fields: this.openSales,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const openSaleDTO: SaleOpenedDTO = {
        salesCode: result.openSaleCode,
      };
      this.barServce.saveOpenSale(openSaleDTO).subscribe({
        next: (res) => {
          if (res.data) {
            this.salesOpenedList = [...this.salesOpenedList, res.data];
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error Occurred When Opening New Sale', error);
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
        showPayment: false,
        // Lipa and Print live in here, not on the bill's card.
        canPay: true
      },

      autoFocus: false
    }
  );

  dialogRef.afterClosed().subscribe(result => {

    // An item may have been taken off: the card's total changed in place.
    this.cdr.markForCheck();

    if (!result) {
      return;
    }

    if (result.action === 'PAY' && this.selectedSale) {
      this.onPay(this.selectedSale);
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
      this.totalPrice = total + (Number(service.lineTotal ?? service.price) || 0);
      return total + (Number(service.lineTotal ?? service.price) || 0);
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

  addingTo: string | null = null;

  saveBarSales(sale: SalesOpened) {
    if (!sale?.uid || this.addingTo) {
      return;
    }
    const dialogRef = this.dialog.open(SaleItemDialogComponent, {
      width: '560px',
      // No opening animation: at a busy till it has to be there at once.
      enterAnimationDuration: 0,
      exitAnimationDuration: 0,
      maxWidth: '95vw',
      autoFocus: false,
      data: { billCode: sale.salesCode },
    });
    dialogRef.afterClosed().subscribe((result?: SaleItemResult) => {
      if (!result) return;
      this.addingTo = sale.uid!;
      this.barServce
        .addSaleItems({
          salesOpenedUID: sale.uid!,
          items: [{ barServiceUID: result.service.uid, quantity: result.quantity }],
        })
        .subscribe({
          next: (res) => {
            this.addingTo = null;
            if (res?.data) {
              this.salesOpenedList = this.salesOpenedList.map((b) =>
                b.uid === res.data.uid ? { ...b, ...res.data } : b,
              );
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.addingTo = null;
            console.error('Error adding to bill:', err);
            this.cdr.detectChanges();
          },
        });
    });
  }

  payingBill: string | null = null;

  /** Lipa: settle the bill, then show its receipt. */
  onPay(sale: SalesOpened) {
    if (!sale?.uid || this.payingBill) {
      return;
    }
    // Fresh lines, so the dialog shows exactly what the backend will charge.
    this.barServce.findBarSalesList(sale.uid).subscribe({
      next: (res) => {
        const lines = res.data ?? [];
        const total = lines.reduce((sum: number, l: any) => sum + (Number(l.lineTotal ?? l.price) || 0), 0);
        if (!lines.length || total <= 0) {
          this.alertService.show('error', this.translate.instant('PAY_BILL.EMPTY'));
          return;
        }
        const dialogRef = this.dialog.open(PayBillDialogComponent, {
          width: '640px',
          maxWidth: '95vw',
          autoFocus: false,
          data: {
            code: sale.salesCode,
            total,
            lines,
            // Noted "paid by phone" at Staff Sell: start on that method, and show the note to check.
            method: sale.paymentNoteMethod || undefined,
            note: sale.paymentNoteMethod
              ? `${this.translate.instant('PAY_BILL.METHOD_' + sale.paymentNoteMethod)} · ${sale.paymentNotePayer}${sale.paymentNoteRef ? ' · ' + sale.paymentNoteRef : ''}`
              : undefined,
          },
        });
        dialogRef.afterClosed().subscribe((result?: PayBillResult) => {
          if (!result) {
            return;
          }
          this.payingBill = sale.uid!;
          this.barServce.payBill({ salesOpenedUID: sale.uid!, payments: result.payments }).subscribe({
            next: (paid) => {
              this.payingBill = null;
              if (paid?.data) {
                // Paid bills leave the open list; the code is free again.
                this.salesOpenedList = this.salesOpenedList.filter((b) => b.uid !== sale.uid);
                this.nicknames.remove(sale.uid);
                this.alertService.show('success', this.translate.instant('PAY_BILL.DONE', { code: sale.salesCode }));
                this.openReceipt(sale.uid!);
              }
              this.cdr.detectChanges();
            },
            error: (err) => {
              this.payingBill = null;
              console.error('Error paying bill:', err);
              this.cdr.detectChanges();
            },
          });
        });
      },
      error: (err) => console.error('Error loading bill lines:', err),
    });
  }

  /** "Paid by phone, from this name" - noted on the bill for the cashier; marks nothing paid. */
  openPaymentNote(bill: SalesOpened): void {
    this.dialog.open(PaymentNoteDialog, {
      width: '440px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { bill },
    }).afterClosed().subscribe((updated?: SalesOpened) => {
      if (updated) {
        bill.paymentNoteMethod = updated.paymentNoteMethod ?? null;
        bill.paymentNotePayer = updated.paymentNotePayer ?? null;
        bill.paymentNoteRef = updated.paymentNoteRef ?? null;
        this.cdr.markForCheck();
      }
    });
  }

  /** Every bill under the chosen staff chip, with a summary, in one receipt dialog and one print job. */
  printStaffBills(): void {
    const bills = this.visibleBills;
    if (!bills.length) {
      return;
    }
    const opt = this.staffOptions.find((o) => o.code === this.staffFilter);
    const opener = this.openerOptions.find((o) => o.key === this.staffFilter);
    const title = opt ? `${opt.code} · ${opt.name}` : opener ? opener.name : this.translate.instant('SALES_PAGE.FILTER_NONE');
    this.dialog.open(ReceiptDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { billUids: bills.map((b) => b.uid!), title },
    });
  }

  /** The chosen staff member handed in less than their bills: record the shortage. */
  recordStaffLoss(): void {
    const opt = this.staffOptions.find((o) => o.code === this.staffFilter);
    if (!opt) {
      return;
    }
    const expected = this.visibleBills.reduce((sum, b) => sum + (Number(b.bill) || 0), 0);
    this.dialog.open(StaffLossDialog, {
      width: '420px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { staffCode: opt.code, staffName: opt.name, expected },
    });
  }

  openReceipt(billUid: string) {
    this.dialog.open(ReceiptDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { billUid },
    });
  }

  deletingBill: string | null = null;

  /** A bill opened by mistake, still at zero - asked once, then gone and its code free again. */
  deleteEmptyBill(sale: SalesOpened) {
    if (!sale?.uid || this.deletingBill) {
      return;
    }
    this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: {
        title: this.translate.instant('SALES_PAGE.DELETE_BILL_TITLE'),
        message: this.translate.instant('SALES_PAGE.DELETE_BILL_CONFIRM', { code: sale.salesCode }),
        item: { ...sale, branchName: sale.salesCode, branchCode: '' },
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.deletingBill = sale.uid!;
      this.cdr.detectChanges();
      this.barServce.deleteEmptyBill(sale.uid!).subscribe({
        next: (res) => {
          this.deletingBill = null;
          if (res?.data) {
            this.salesOpenedList = this.salesOpenedList.filter((b) => b.uid !== sale.uid);
            this.nicknames.remove(sale.uid);
            this.alertService.show('success', this.translate.instant('SALES_PAGE.BILL_DELETED', { code: sale.salesCode }));
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.deletingBill = null;
          this.cdr.detectChanges();
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
          // The branch's whole open list: a nickname whose bill is not in it was paid elsewhere.
          this.nicknames.keepOnly(this.salesOpenedList.map((b) => b.uid));
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
                  // A split bill counts towards each method it was paid
                  // with, by the amount paid that way.
                  let parts: { method: string; amount: number }[] = [];
                  try {
                    parts = sale.paymentBreakdown ? JSON.parse(sale.paymentBreakdown) : [];
                  } catch {
                    parts = [];
                  }
                  if (!parts.length && sale.paymentMethod && sale.paymentMethod !== 'split') {
                    parts = [{ method: sale.paymentMethod, amount: Number(sale.bill || 0) }];
                  }
                  for (const part of parts) {
                    const method = part.method?.toLowerCase();
                    if (!method) {
                      continue;
                    }
                    if (!result[method]) {
                      result[method] = { count: 0, total: 0 };
                    }
                    result[method].count += 1;
                    result[method].total += Number(part.amount || 0);
                  }
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
