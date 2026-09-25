import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Authentication } from '../../Utils/services/authentication';
import { POS_FULL_ACCESS_ROLES } from '../pos-role.guard';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Title2 } from '../../Utils/component/title2/title2';
import { MatIcon } from '@angular/material/icon';
import { FormField } from '../../Utils/models/form-field';
import { ServiceBarMethod } from '../service-bar-method';
import { error } from 'console';
import { Store, StoreDTO } from '../BarModel';
import { AlertService } from '../../Utils/services/alert';
import { PageableParam } from '../../Utils/models/responces';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';


@Component({
  selector: 'app-bar-bookings',
  imports: [
    EmptyStateComponent,Title2, MatIcon, DecimalPipe, UpperCasePipe, TranslatePipe],
  templateUrl: './bar-store.html',
  styleUrl: './bar-store.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStore implements OnInit{
  staffFields: any;
  savedData($event: Event) {
    throw new Error('Method not implemented.');
  }

  constructor(
    private visibility: Authentication,
    private barService: ServiceBarMethod,
    private alert: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {}
  ngOnInit(): void {
    this.selectedBooking = 'STORE.MANAGE';
    this.loadBarStorePage();
  }
  selectedBooking = '';
  titleActions: TitleAction[] = [
    {
      icon: 'setting',
      title: 'STORE.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
  ];

  // Store buttons: CEO (and above) and MANAGER see all three - available,
  // in use and closed. CASHIER only sees available + in use.
  get canSeeClosedStores(): boolean {
    return [...POS_FULL_ACCESS_ROLES, 'MANAGER'].some(role => this.visibility.hasRole(role));
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.selectedBooking = action;
    switch (action) {
      case 'STORE.MANAGE':
        this.loadBarStorePage();
        this.deleteStore = false;

        break;
    }
  }

  openAddStoreDialog(): void {

    this.loadBarService();

    this.translate.get('STORE_PAGE.FORM_TITLE_ADD').subscribe(formTitle => {

      const dialogRef = this.dialog.open(DialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        data: {
          formTitle,
          fields: this.bookingFields,
        },
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.onSaveStore(result);
        }
      });
    });
  }

  bookingFields: FormField[] = [
    {
      name: 'nameOfStore',
      type: 'text',
      label: 'Store Item Name',
      placeholder: 'Enter Store Item Name',
      required: true,
    },

    {
      name: 'quantity',
      type: 'number',
      label: 'Enter Quantity',
      placeholder: 'Enter Store Item Quantity',
      required: true,
    },

    {
      name: 'buyingPrice',
      type: 'number',
      label: 'Enter Buying Price',
      placeholder: 'Enter Single Item Buying Price',
      required: true,
    },

    {
      name: 'barService',
      type: 'select',
      label: 'Attached Service',
      placeholder: 'Attach Bar Service',
      required: true,
      options: [],
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      placeholder: 'Enter service description',
      required: true,
    },
  ];

  loadBarService() {
    this.barService.findBarServiceList().subscribe({
      next: (res) => {
        if (res.data) {
          console.log('Services Found', res.data);
          const options = res.data.map((service: any) => ({
            label: service.serviceName,
            value: service.uid,
          }));
          const serviceField = this.bookingFields.find((field) => field.name === 'barService');
          if (serviceField) {
            serviceField.options = options;
          }
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error('Error Occurred when Fetching Service', error);
      },
    });
  }
  onSaveStore(store: any) {
    const storeDTO: StoreDTO = {
      nameOfStore: store.nameOfStore,
      quantity: store.quantity,
      description: store.description,
      barServiceEntityUID: store.barService,
      buyingPrice: store.buyingPrice,
    };

    console.log('Store to save', storeDTO);

    this.barService.saveStore(storeDTO).subscribe({
      next: (res) => {
        if (res.data) {
          this.alert.show('success', 'Store saved successfully');

          // Refresh the Manage Store table so the new item shows up.
          this.loadBarStorePage();

          console.log('Response Data', res.data);
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error('Error Occurred when saving store', error);
        this.alert.show('error', 'Error Occurred When Saving Store');
      },
    });
  }

  storeDataSource: Store[] = [];
  storeOpenDataSource: Store[] = [];

  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;
  searchParam: string = '';
  loadBarStorePage(): void {
    this.storeOpenDataSource=[];
    const params: PageableParam = {
      page: this.currentPage,
      size: this.pageSize,
    };

    this.barService.findBarStorePage(params).subscribe({
      next: (res) => {
        console.log('Stores Found:', res);
        if (res.data) {
          this.storeDataSource = res.data.map((item: any) => ({
            uid: item.uid,
            nameOfStore: item.nameOfStore,
            codeOfStore: item.codeOfStore,
            description: item.description,
            quantity: item.quantity,
            nameOfService: item.serviceName,
            openedDate: item.openedDate,
            totalQuantityPrice: item.totalQuantityPrice,
            usedQuantity: item.usedQuantity,
            notUsedQuantity: item.notUsedQuantity,
            status: item.status,
            buyingPrice: item.buyingPrice,
          }));
           this.cdr.detectChanges();
          this.totalElements = res.totalElements ?? res.data?.length ?? 0;
          this.totalPages = Math.ceil(this.totalElements / this.pageSize);
          this.cdr.detectChanges();
        } else {
          this.storeDataSource = [];
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error('Error Occurred when Fetching Stores:', error);
      },
    });
  }
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadBarStorePage();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadBarStorePage();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadBarStorePage();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadBarStorePage();
  }

  deleteStore: boolean = false;
  storeRecord: Store = {};
  onDeleteStore(event: Store): void {
    this.storeRecord = event;
    this.deleteStore = true;
    console.log('Store Delete:', this.storeRecord);
  }
  onConfirmDeleteStore(event: Store): void {
    console.log('Store Delete:', this.storeRecord);
    if (!event.uid) {
      return;
    }
    this.barService.deleteStore(event.uid).subscribe({
      next: (res) => {
        if (res.data) {
          const index = this.storeDataSource.findIndex((item) => item.uid === res.data.uid);
          if (index !== -1) {
            this.storeDataSource.splice(index, 1);
            this.storeDataSource = [...this.storeDataSource];
            this.cdr.detectChanges();
            this.alert.show('success', 'Store deleted successfully');
          }
          this.deleteStore = false;
          this.storeRecord = {};
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error('Error deleting store:', error);

        this.alert.show('error', 'Failed to delete store');
      },
    });
  }

  addQuantityFields: FormField[] = [
    {
      name: 'quantity',
      type: 'number',
      placeholder: 'Enter Store Item Quantity',
      required: true,
    },
  ];
 addQuantityToStore(store: any) {
  const dialogRef = this.dialog.open(DialogComponent, {
    width: '700px',
    panelClass: 'custom-dialog',
    position: {
      top: '350px',
    },
    data: {
      formTitle: `Add Quantity (Current: ${store.quantity} AVL)`,
      fields: this.addQuantityFields,
    },
  });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const storeDTO: StoreDTO = {
          uid: store.uid,
          quantity: result.quantity,
        };
        this.barService.addQuantityToStore(storeDTO).subscribe({
          next: (res) => {
            if (res.data) {
              this.alert.show('success', 'Quantity added successfully');
              console.log('Store to add quantity', res.data);
              const index = this.storeDataSource.findIndex((item) => item.uid === res.data.uid);
              if (index !== -1) {
                this.storeDataSource[index].nameOfService =
                  res.data.barServiceEntity.serviceName;
                this.storeDataSource[index].nameOfStore = res.data.nameOfStore;
                this.storeDataSource[index].codeOfStore = res.data.codeOfStore;
                this.storeDataSource[index].description = res.data.description;
                this.storeDataSource[index].buyingPrice = res.data.buyingPrice;
                this.storeDataSource[index].status = res.data.status;
                this.storeDataSource[index].quantity = res.data.quantity;
                this.storeDataSource[index].totalQuantityPrice = res.data.totalQuantityPrice;
                this.storeDataSource[index].usedQuantity = res.data.usedQuantity;
                this.storeDataSource[index].notUsedQuantity = res.data.notUsedQuantity;
                this.cdr.detectChanges();
              }
            }
          },
          error: (error) => {
            console.error('Error Occurred when adding quantity to store', error);
            this.alert.show('error', 'Error Occurred When Adding Quantity to Store');
          },
        });
      }
    });
  }

   openStoreFields: FormField[] = [
    {
      name: 'quantity',
      type: 'number',
      placeholder: 'Enter Store Item Quantity',
      readonly: true,
      required: false,
    },
  ];

  openStore(store: any) {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '700px',
      panelClass: 'custom-dialog',
      position: {
        top: '350px',
      },
  data: {
  formTitle: `1 quantity will be opened and made available (Current Qty: ${store.notUsedQuantity} AVL)`,
  message: '1 quantity will be opened and made available for use.',
  fields: this.openStoreFields,
  formData: {
    ...store,
    quantity: 1
  },
},

    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const storeDTO: StoreDTO = {
          uid: store.uid,
        };
        this.barService.openStore(storeDTO).subscribe({
          next: (res) => {
            if (res.data) {
              this.alert.show('success', 'Store opened successfully');
              const index = this.storeDataSource.findIndex((item) => item.uid === res.data.uid);
              if (index !== -1) {
                this.storeDataSource[index].nameOfStore = res.data.nameOfStore;
                this.storeDataSource[index].codeOfStore = res.data.codeOfStore;
                this.storeDataSource[index].description = res.data.description;
                this.storeDataSource[index].buyingPrice = res.data.buyingPrice;
                this.storeDataSource[index].status = res.data.status;
                this.storeDataSource[index].quantity = res.data.quantity;
                this.storeDataSource[index].totalQuantityPrice = res.data.totalQuantityPrice;
                this.storeDataSource[index].usedQuantity = res.data.usedQuantity;
                this.storeDataSource[index].notUsedQuantity = res.data.notUsedQuantity;
                this.cdr.detectChanges();
                console.log('Store opened successfully:', this.storeDataSource[index]);
              }
            }
          },
          error: (error) => {
            console.error('Error Occurred when opening store', error);
            this.alert.show('error', 'Error Occurred When Opening Store');
          },
        });
      }
    });
  }


  /******************************************************************************************.  STORES THAT IS OPEN.  *************************************************************************** */
  search:string=''
  findOpenClosedStorePage(): void {
    this.storeDataSource = [];
    const params: PageableParam = {
      page: this.currentPage,
      size: this.pageSize,
      searchParam: this.search
    };

    this.barService.findOpenStorePage(params).subscribe({
      next: (res) => {
        if (res.data) {
          this.storeOpenDataSource = res.data.map((item: any) => ({
            uid: item.uid,
            nameOfStore: item.nameOfStore,
            codeOfStore: item.openStoreCode,
            description: item.description,
            quantity: item.quantity,
            nameOfService: item.serviceName,
            openedDate: item.openedDate,
            closedDate:item.closedDate,
            totalQuantityPrice: item.totalQuantityPrice,
            usedQuantity: item.usedQuantity,
            notUsedQuantity: item.notUsedQuantity,
            status: item.status,
            buyingPrice: item.buyingPrice,
            openQuantity: item.openQuantity,
          }));

          this.totalElements = res.totalElements ?? res.data?.length ?? 0;
          this.totalPages = Math.ceil(this.totalElements / this.pageSize);
          this.cdr.detectChanges();
              console.log('Open Stores Found:', res.data);
        } else {
          this.storeDataSource = [];
          this.cdr.markForCheck();
        }
      },

      error: (error) => {
        console.error('Error Occurred when Fetching Stores:', error);
      },
    });
  }
  nextPageOpenStore(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.findOpenClosedStorePage();
    }
  }

  previousPageOpenStore(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.findOpenClosedStorePage();
    }
  }

  goToPageOpenStore(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.findOpenClosedStorePage();
    }
  }

  changePageSizeOpenStore(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.findOpenClosedStorePage();
  }

  closeOpenStore(event:any){
    const storeDTO:StoreDTO={
      openStoreUID: event.uid,
    }
    this.barService.closeOpenStore(storeDTO).subscribe({
      next:(res)=>{
        if(res.data){

          const index = this.storeOpenDataSource.findIndex(idx=> idx.uid === res.data.uid)
          if(index !==-1){
            this.storeOpenDataSource[index].uid = res.data.uid,
            this.storeOpenDataSource[index].closedDate=res.data.updatedAt,
            this.storeOpenDataSource[index].status=res.data.status,
            this.storeOpenDataSource[index].codeOfStore=res.data.openStoreCode,
            this.storeOpenDataSource[index].nameOfService =res.data.store.barServiceEntity.serviceName;

            this.cdr.detectChanges();
            console.log('Closed Data', res.data);
          }
        }
      },
      error(err) {
          console.error('Error Occurred', err)
      },
    })
  }

findClosedStorePage(){
  this.search='CLOSED'
  this.storeOpenDataSource=[]
  this.findOpenClosedStorePage();
}
findOpenStorePage(){
   this.search='OPEN'
  this.storeOpenDataSource=[]
  this.findOpenClosedStorePage();
}

}
