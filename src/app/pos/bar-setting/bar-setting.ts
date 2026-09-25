import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, Title2 } from "../../Utils/component/title2/title2";
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from "@angular/material/icon";
import { FormField } from '../../Utils/models/form-field';
import { CommissionDTO, BarServiceData, BarServiceDTO, UserTableData } from '../BarModel';
import { ServiceBarMethod } from '../service-bar-method';
import { AlertService } from '../../Utils/services/alert';
import { RecordtableComponent } from "../../Utils/component/recordtable/recordtable";
import { PageableParam, TableColumn } from '../../Utils/models/responces';
import { MatTableDataSource } from '@angular/material/table';
import { TableComponent } from "../../Utils/component/table/table";
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { ServiceDetailsDialogComponent } from '../../Utils/component/dialogs/service-details-dialog-component/service-details-dialog-component';
import { EditCommissionDialogComponent } from '../../Utils/component/dialogs/edit-commission-dialog-component/edit-commission-dialog-component';
import { error } from 'console';
import { DeleteConfirmationComponent } from '../../Utils/component/dialogs/delete-confirmation-component/delete-confirmation-component';
import { UserRoleDialogComponent } from '../../Utils/component/dialogs/user-role-dialog-component/user-role-dialog-component';
import { ActivationCodeDialogComponent } from '../../Utils/component/dialogs/activation-code-dialog-component/activation-code-dialog-component';
import { SelectStaffDialogComponent } from '../../Utils/component/dialogs/select-staff-dialog-component/select-staff-dialog-component';
import { UserService } from '../../settings/users-setting/user-service';
import { AssignUserRoleDTO, UserDTO } from '../../settings/users-setting/user-model';
import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { ComfirmDialogComponent } from '../../Utils/component/comfirm-dialog/comfirm-dialog';

export interface BarServiceEntity {
  uid?: string;
  serviceName?: string;
  serviceCode?: string;
  status?: string;
  description?: string;
  commissionType?: string;
  commissionValue?: number;
  duration?: number;
  price?: number;
  updatedAt?: string | null;
  usageType?:string;
}

@Component({
  selector: 'app-bar-setting',
  imports: [
    EmptyStateComponent,Title2, MatIconModule, RecordtableComponent, DecimalPipe, UpperCasePipe, CommonModule, FormsModule, MatMenuModule, MatPaginator, MatButtonModule, TranslatePipe, MatTooltipModule],
  templateUrl: './bar-setting.html',
  styleUrl: './bar-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSetting implements OnInit{
// Templates can't see the global `Math` object directly — expose it
// here so `Math.min(...)` in bar-setting.html resolves.
protected readonly Math = Math;

changePage(arg0: number) {
throw new Error('Method not implemented.');
}
changePageSize($event: Event) {
throw new Error('Method not implemented.');
}

  barServiceInfo:Boolean=false;
  barServiceAddForm:Boolean=false;
  constructor(
    private visibility: Authentication, private service: ServiceBarMethod, private alertService: AlertService, private cdr: ChangeDetectorRef,
    private dialog:MatDialog, private barService:ServiceBarMethod, private userService: UserService,
    private translate: TranslateService
  ) { }
  ngOnInit(): void {
    this.selectedSetting='SALON.SERVICE'
      this.barServiceInfo=false;
  this.barServiceAddForm=false;
  this.serviceDataSource.data=[];
  this.findBarServicePage();
  this.addCommission=false;
  }
  selectedSetting = '';
  titleActions: TitleAction[] = [
    {
      icon: 'person2',
      title: 'SALON.STAFF',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },
    {
      icon: 'service',
      title: 'SALON.SERVICE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },

    {
      icon: 'commission',
      title: 'SALON.COMMISSION',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
  this.selectedSetting = action;
 if (action === 'SALON.SERVICE') {
  this.barServiceInfo=false;
  this.barServiceAddForm=false;
  this.serviceDataSource.data=[];
  this.findBarServicePage();
  this.addCommission=false;

 }
  if (action === 'SALON.COMMISSION') {
  this.addCommission=false;
  this.findCommissionPage();

 }
 if(action === 'SALON.STAFF'){
  this.findUserPageByBranch();

 }
}
serviceFields:FormField[] = [
  {
    name: 'serviceName',
    type: 'text',
    label: 'Service Name',
    placeholder: 'Enter service name',
    required: true,
  },
    {
    name: 'serviceCode',
    type: 'text',
    label: 'Service Code',
    placeholder: 'Enter service code',
    required: true,
  },
  {
    name: 'price',
    type: 'number',
    label: 'Price',
    placeholder: 'Enter price',
    required: true,
  },
  {
    name: 'duration',
    type: 'number',
    label: 'Duration (in minutes)',
    placeholder: 'Enter duration in minutes',
    required: true,
  },
   {
    name: 'status',
    type: 'select',
    placeholder: 'Enter status',
    required: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'Not Active', label: 'Not Active' }
    ]
  },
   {
    name:'usageType',
    type:'select',
    placeholder:'Usage Type',
    options:[{label:'ASSIGNED', value:'ASSIGNED'}, {label:'SHARED', value:'SHARED'}]
  },
    {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Enter service description',
    required: true,

  },

]

serviceFieldsEdit:FormField[] = [
  {
    name: 'serviceName',
    type: 'text',
    placeholder: 'Enter service name',
    required: true,
  },
    {
    name: 'serviceCode',
    type: 'text',
    placeholder: 'Enter service code',
    required: true,
  },
  {
    name: 'price',
    type: 'number',
    placeholder: 'Enter price',
    required: true,
  },
  {
    name: 'duration',
    type: 'number',
    placeholder: 'Enter duration in minutes',
    required: true,
  },
  {
    name:'usageType',
    type:'select',
    placeholder:'Usage Type',
    options:[{label:'ASSIGNED', value:'ASSIGNED'}, {label:'SHARED', value:'SHARED'}]
  },
    {
    name: 'status',
    type: 'select',
    placeholder: 'Enter status',
    required: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'Not Active', label: 'Not Active' }
    ]
  },
    {
    name: 'description',
    type: 'textarea',
    placeholder: 'Enter service description',
    required: true,

  },

]

barServiceEntity: BarServiceEntity = {};
barServiceList: BarServiceEntity[] = [];
serviceColumns: {
  field: string;
  header: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconColor?: string;
  cellColors?: {
    [value: string]: {
      background: string;
      color: string;
    };
  };
}[] = [
  {
    field: 'serviceName',
    header: 'Service',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#413e58'
  },
  {
    field: 'serviceCode',
    header: 'Code'
  },
  {
    field: 'price',
    header: 'Price',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#28a745'
  },
  {
    field: 'duration',
    header: 'Duration',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#6c757d'
  },
   {
    field: 'usageType',
    header: 'usageType',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#6c757d'
  },
  {
    field: 'status',
    header: 'Status'
  }
];
onAddService(){
  this.barServiceInfo=false;
  const dialogRef = this.dialog.open(DialogComponent, {
    width: '720px',
    maxWidth: '95vw',
    autoFocus: false,
    data: {
      formTitle: 'Add Service',
      fields: this.serviceFields,
    },
  });

  dialogRef.afterClosed().subscribe((data) => {
    if (data) {
      this.submitServiceForm(data);
    }
    this.cdr.markForCheck();
  });
}
submitServiceForm(data: any) {
    this.barServiceAddForm=false;
    this.barServiceInfo=false;
  const barServiceDTO:BarServiceDTO={
    serviceName: data.serviceName,
    serviceCode: data.serviceCode,
    price: data.price,
    duration: data.duration,
    status: data.status,
    description: data.description,
    usageType:data.usageType
  }
  console.log('Service DTO:', barServiceDTO);
  this.service.saveBarEntity(barServiceDTO).subscribe({
    next: (response) => {
      if(response){
        this.alertService.show('success', 'Service saved successfully!');
        this.findBarServicePage();
        console.log('Service saved successfully:', response.data);
        this.cdr.markForCheck();
      }
    },
    error: (error) => {
      console.error('Error saving service:', error);
    }
  })
  }


   onViewRecord(row: any) {
    this.dialog.open(ServiceDetailsDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: row,
    });
   }

   param:PageableParam = {
    page: 0,
    size: 5,
  }
  onPageChange(newPage: number) {
    this.param.page = newPage;
  }


serviceDataSource = new MatTableDataSource<BarServiceEntity>([]);
serviceEditUID:string='';
tableConfig = {
  displayedColumns: [
    { field: 'serviceName', header: 'SERVICE NAME' },
    { field: 'serviceCode', header: 'SERVICE CODE' },
    { field: 'price', header: 'PRICE' },
    { field: 'duration', header: 'DURATION' },
    {field:'usageType', header:'usageType'},
    { field: 'status', header: 'STATUS' }
  ] as TableColumn[]
};

findBarServicePage() {
  this.barServiceAddForm = false;
  this.barServiceInfo = false;
  this.barServiceEntity = {};

  this.param = {
    page: this.page,
    size: this.size
  };

  this.service.findBarServicePage(this.param).subscribe({
    next: (response) => {
      if (response) {
        this.serviceDataSource.data = response.data || [];

        // Pagination information kutoka backend
        this.totalElements = response.totalElements || 0;
        this.totalPages = response.totalPages || 0;

        console.log('Page:', this.page);
        console.log('Size:', this.size);
        console.log('Total Elements:', this.totalElements);
        console.log('Total Pages:', this.totalPages);
        console.log('Services:', this.serviceDataSource.data);

        this.cdr.detectChanges();
      }
    },

    error: (error) => {
      console.error('Error fetching bar service page:', error);
    }
  });
}

previousPage() {
  if (this.page > 0) {
    this.page--;
    this.findBarServicePage();
  }
}

nextPage() {
  if (this.page < this.totalPages - 1) {
    this.page++;
    this.findBarServicePage();
  }
}



   onEditRecord(row: any) {
    console.log('Edit record:', row);
    this.serviceEditUID = row.uid
        const dialogRef = this.dialog.open(DialogComponent, {
          width: '1200px',
          data: {
            formTitle: 'Update Service',
            fields: this.serviceFieldsEdit,
            formData: [row],
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (!result) return;
           console.log('Updated form data:', result);
              const barServiceDTO:BarServiceDTO={
              uid: this.serviceEditUID,
              serviceName: result.serviceName,
              serviceCode: result.serviceCode,
              price: result.price,
              duration: result.duration,
              status: result.status,
              description: result.description,
              usageType:result.usageType
            }
            console.log('Service Edited Value is:', barServiceDTO);
              this.service.saveBarEntity(barServiceDTO).subscribe({
                  next: (response) => {
                    if(response){
                      this.alertService.show('success', 'Service Updated successfully!');
                      this.findBarServicePage();
                      this.cdr.markForCheck();
                    }
                  },
                  error: (error) => {
                    console.error('Error saving service:', error);
                  }
                })
          });


   }
   onDeleteRecord(row:any){
    const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
      width: '420px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        itemName: row.serviceName || row.serviceCode || 'Service',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteService(row.uid);
      }
    });
   }

    private deleteService(serviceUID: string): void {
    this.service.deleteServiceBarByUID(serviceUID).subscribe({
      next:(res)=>{
        if(res){
          console.log('Service Deleted Successfully', res.data);
          this.alertService.show('success', 'Service successfully Deleted');
          this.findBarServicePage();
          this.cdr.markForCheck();
        }
      },
      error:(error)=>{
        console.error('Error Occurred', error)
        this.alertService.show('error', 'Error When Deleting Service');
      }
    })
   }



   /****
    * ************************************************************************** COMMISSIONS METHODS*****************************************************************
    */

   addCommission:Boolean=false;
   configureCommission:Boolean=false;
   selectedService:Boolean=false;
   barServiceData:BarServiceData={};
addCommissionForm: FormField[] = [
  {
    name: 'serviceName',
    type: 'select',
    placeholder: 'Service/Huduma',
    required: true,
    options: []
  }
];

findBarServiceList() {
  this.addCommission = true;
   this.selectedService=false;
   this.commissionDataSource=[];
  this.barService.findBarServiceList().subscribe({
    next: (res) => {
      console.log('Service Founds', res.data)
this.addCommissionForm[0].options = (res.data ?? []).map((service: any) => ({
  label: service.serviceName,
  value: service.uid
}));
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error Occurred', error);
      this.alertService.show('error', 'Error When Loading Services');
    }
  });
}

    onAddCommission(){
      this.commissionDataSource=[];
    this.selectedService=false;
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '1200px',
      data:{
        formTitle: 'Select Service/Chagua Huduma',
        fields: this.addCommissionForm,
      }

    });
     dialogRef.afterClosed().subscribe((result) => {
          if (!result) return;
          console.log('Commission Selected', result)
          this.barService.findBarServiceByUID(result.serviceName).subscribe({
            next:(res)=>{
              if(res){
                console.log('Service By UID', res.data);
                this.barServiceData=res.data;
                this.selectedService=true;
                this.cdr.detectChanges();
              }
            },
             error: (error) => {
      console.error('Error Occurred', error);
      this.alertService.show('error', 'Error When Loading Services');
    }
          })
     })
   }


servicePrice = 0;
remainingAmount = 0;

commissionRows = [
  { name: 'Staff Commission', code: 'STF', amount: 0, percentage: 0 },
  { name: 'Owner Commission', code: 'OWN', amount: 0, percentage: 0 },
  { name: 'Maintenance', code: 'MTN', amount: 0, percentage: 0 },
  { name: 'TRA Commission', code: 'TRA', amount: 0, percentage: 0 },
  { name: 'Emergency', code: 'EMG', amount: 0, percentage: 0 },
  { name: 'Others', code: 'OTH', amount: 0, percentage: 0 },
  { name: 'Rent', code: 'RT', amount: 0, percentage: 0 },
  { name: 'Loan', code: 'LN', amount: 0, percentage: 0 },
  { name: 'Luku', code: 'LK', amount: 0, percentage: 0 },
  { name: 'Water', code: 'WTR', amount: 0, percentage: 0 },
  { name: 'Stock Purchase', code: 'SP', amount: 0, percentage: 0 }
];

calculateCommission(row: any) {
  const price = Number(this.barServiceData.price) || 0;
  const amount = Number(row.amount) || 0;

  row.percentage = price > 0
    ? (amount / price) * 100
    : 0;

  this.remainingAmount = price -
    this.commissionRows.reduce(
      (total, item) => total + (Number(item.amount) || 0),
      0
    );
}

saveCommission() {

  const commission: CommissionDTO = {
    barServiceUID: this.barServiceData.uid,

    staffPercent:
      this.commissionRows.find(x => x.code === 'STF')?.percentage || 0,

    ownerPercent:
      this.commissionRows.find(x => x.code === 'OWN')?.percentage || 0,

    maintenancePercent:
      this.commissionRows.find(x => x.code === 'MTN')?.percentage || 0,

    traPercent:
      this.commissionRows.find(x => x.code === 'TRA')?.percentage || 0,

    emergencyPercent:
      this.commissionRows.find(x => x.code === 'EMG')?.percentage || 0,

    otherPercent:
      this.commissionRows.find(x => x.code === 'OTH')?.percentage || 0,
    loanPercent:
      this.commissionRows.find(x => x.code === 'LN')?.percentage || 0,
          rentPercent:
      this.commissionRows.find(x => x.code === 'RT')?.percentage || 0,
          waterPercent:
      this.commissionRows.find(x => x.code === 'WTR')?.percentage || 0,
          lukuPercent:
      this.commissionRows.find(x => x.code === 'LK')?.percentage || 0,
        stockPurchasePercent:
      this.commissionRows.find(x => x.code === 'SP')?.percentage || 0,

    totalPercent: this.commissionRows.reduce(
      (total, row) => total + (Number(row.percentage) || 0),
      0
    )
  };

  console.log('Commission DTO:', commission);
  this.barService.saveCommissions(commission).subscribe({
    next:(res)=>{
      if(res){
        console.log('Commission saved', res.data);
        this.alertService.show('success', 'commission saved')
         this.addCommission =false;
         this.selectedService=false;
         this.serviceDataSource.data=[]
         this.cdr.detectChanges();
      }
    },
     error: (error) => {
      console.error('Error Occurred', error);
      this.alertService.show('error', 'Error When Loading Services');
  }
})
}
page = 0;
size = 5;

totalElements = 0;
totalPages = 0;
commissionDataSource: any[] = [];

findCommissionPage() {
  this.addCommission = false;
  this.selectedService = false;
  const params: PageableParam = {
    page: this.page,
    size: this.size
  };

  this.barService.findCommissionPage(params).subscribe({
    next: (res) => {
      if (res.data) {
        this.commissionDataSource = res.data;

        // Muhimu: hizi lazima zitoke kwenye pagination response
        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;

        this.cdr.detectChanges();

        console.log('Data Found:', res);
      }
    },
    error: (err) => {
      console.error('Error fetching commission page:', err);
    }
  });
}
onCommissionPageChange(event: PageEvent) {
  this.page = event.pageIndex;
  this.size = event.pageSize;

  this.findCommissionPage();
}


editCommission(commission: any) {
  const dialogRef = this.dialog.open(EditCommissionDialogComponent, {
    width: '480px',
    maxHeight: '85vh',
    data: { commission },
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (!result) return;

    const commissionDTO: CommissionDTO = {
      uid: commission.uid,
      barServiceUID: commission.barServiceUID,
      ...result,
    };

    this.barService.saveCommissions(commissionDTO).subscribe({
      next: (res) => {
        if (res) {
          this.alertService.show('success', 'Commission updated successfully');
          const index = this.commissionDataSource.findIndex(item => item.uid === commission.uid);
          if (index !== -1) {
            // Merge instead of replacing outright: the update response only
            // carries the CommissionDTO fields, not the joined display
            // fields (e.g. serviceName, price) the list endpoint returns -
            // a full replace was wiping those out of the row after saving.
            this.commissionDataSource[index] = { ...this.commissionDataSource[index], ...res.data };
            this.commissionDataSource = [...this.commissionDataSource];
            this.cdr.detectChanges();
          }
        }
      },
      error: (error) => {
        console.error('Error updating commission:', error);
        this.alertService.show('error', error?.error?.message || 'Error updating commission');
      }
    });
  });
}

deleteCommission(commission: any) {
  console.log('Delete commission:', commission);

  this.barService.deleteCommission(commission.uid).subscribe({
    next: (res) => {
      console.log('Commission deleted successfully:', res);

      this.commissionDataSource = this.commissionDataSource.filter(
        (item) => item.uid !== commission.uid
      );

      this.totalElements--;

      if (this.commissionDataSource.length === 0 && this.page > 0) {
        this.page--;
      }

      this.findCommissionPage();
      this.cdr.detectChanges();

      this.alertService.show(
        'success',
        'Commission successfully deleted'
      );
    },

    error: (err) => {
      console.error('Error deleting commission:', err);

      this.alertService.show(
        'error',
        err?.error?.message || 'Error deleting commission'
      );
    }
  });
}



userDataSource: UserTableData[] = [];findUserPageByBranch() {

  const params: PageableParam = {
    page: this.page,
    size: this.size
  };

  this.barService.findUserPageByBranch(params).subscribe({

    next: (res) => {

      if (res.data) {

        this.userDataSource = res.data.map((user: any): UserTableData => ({

          uid: user.uid,

          username: user.username || '--',

          firstName: user.firstName,

          lastName: user.lastName,

          fullName: [
            user.firstName,
            user.middleName,
            user.lastName
          ]
            .filter(Boolean)
            .join(' ') || '--',

          roleName: user.roles?.[0]?.name || '--',

          branchName: user.branch?.branchName || '--',

          isBlocked: user.isBlocked === true

        }));

        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;

        this.page = res.currentPage;
        this.size = res.size;

        this.cdr.detectChanges();

        console.log('User Table Data:', this.userDataSource);
      }

    },

    error: (err) => {
      console.error('Error fetching users:', err);
    }

  });
}

addUser(): void {

  // The roles have to be in hand before the dialog opens: the role is
  // chosen while registering, not in a second step afterwards, and only
  // the ones this viewer is allowed to grant are offered.
  this.userService.findRoleByBranch().subscribe({

    next: (roleRes) => {
      const assignableRoleNames = this.getAssignableRoleNames();
      const roles = (roleRes.data || []).filter((role: any) =>
        assignableRoleNames.includes(role.name)
      );
      this.openAddUserDialog(roles);
    },

    error: () => {
      // Without the list the dialog would ask for a role it cannot offer,
      // so let it through without one and fall back to Assign role.
      this.openAddUserDialog([]);
    },
  });
}

private openAddUserDialog(roles: any[]): void {

  const dialogRef = this.dialog.open(SelectStaffDialogComponent, {
    width: '560px',
    maxWidth: '95vw',
    data: { roles },
  });

  dialogRef.afterClosed().subscribe((staff) => {

    if (!staff) {
      return;
    }

    const userDTO: UserDTO = {
      firstName: staff.firstName,
      middleName: staff.middleName,
      lastName: staff.lastName,
      gender: staff.gender,
      dob: staff.dateOfBirth,
      phone: staff.phoneNumber,
      email: staff.email,
      address: staff.address,
      role: staff.role,
      branch: this.visibility.getBranchUID(),
    };

    this.userService.saveUser(userDTO).subscribe({

      next: (res) => {
        if (res.data) {
          this.alertService.show('success', 'User Added');
          this.showActivationCode(res.data, staff.phoneNumber);
          this.findUserPageByBranch();
          this.cdr.markForCheck();
        }
      },

      error: (err) => {
        this.alertService.show('error', err?.error?.message || 'Failed to add user');
      }
    });
  });
}

roles: any[] = [];
userRoles: any[] = [];
selectedRoleUIDs: string[] = [];

// What roles the currently logged-in user is allowed to grant, based on
// their own role. ROOT can assign anything; everyone else can only hand
// out roles below their own rank.

/**
 * Shows the one-time code to whoever just registered someone, so the person
 * standing at the counter can sign in straight away instead of waiting on a
 * text. It is the only moment the code is readable - it is stored hashed.
 */
private showActivationCode(data: any, phone?: string): void {

  if (!data?.activationCode) {
    return;
  }

  this.dialog.open(ActivationCodeDialogComponent, {
    width: '420px',
    maxWidth: '95vw',
    disableClose: true,
    data: {
      username: data.user?.username ?? '',
      activationCode: data.activationCode,
      validHours: data.validHours ?? 72,
      phone,
    },
  });
}

private getAssignableRoleNames(): string[] {

  if (this.visibility.hasRole('ROOT')) {
    return ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'];
  }
  if (this.visibility.hasRole('DIRECTOR')) {
    return ['STAFF', 'MANAGER', 'CEO', 'CASHIER'];
  }
  if (this.visibility.hasRole('CEO')) {
    return ['CASHIER', 'MANAGER'];
  }
  if (this.visibility.hasRole('STAFF')) {
    return ['CEO', 'CASHIER', 'MANAGER'];
  }

  return [];
}

/** Which row is mid-request, so its button cannot be pressed twice. */
blockingUid: string | null = null;

/**
 * Revokes a branch user's access, or gives it back.
 *
 * Deliberately not a delete. Their uid is what branches.created_by, the
 * commission payouts and the subscription payments all point at - removing
 * the row would orphan every one of those and quietly change what people
 * are owed. This stops the login and leaves the history standing, which is
 * what "they no longer work here" actually means.
 */
onToggleAccess(user: UserTableData): void {

  if (this.blockingUid) {
    return;
  }

  const revoking = !user.isBlocked;

  this.dialog.open(ComfirmDialogComponent, {
    width: '440px',
    maxWidth: '95vw',
    data: {
      title: this.translate.instant(
        revoking ? 'SETTING_PAGE.REVOKE_TITLE' : 'SETTING_PAGE.RESTORE_TITLE'),
      message: this.translate.instant(
        revoking ? 'SETTING_PAGE.REVOKE_MESSAGE' : 'SETTING_PAGE.RESTORE_MESSAGE',
        { name: user.fullName }),
      confirmLabel: this.translate.instant(
        revoking ? 'SETTING_PAGE.BTN_REVOKE_USER' : 'SETTING_PAGE.BTN_RESTORE_USER'),
    },
  }).afterClosed().subscribe(confirmed => {

    if (!confirmed) {
      return;
    }

    this.blockingUid = user.uid;

    this.barService.setUserBlocked(user.uid, revoking).subscribe({

      next: (res) => {
        this.blockingUid = null;
        const outcome = res?.data;

        if (outcome === 'BLOCKED' || outcome === 'RESTORED') {
          // Changed in place: refetching the page would only make it blink.
          user.isBlocked = revoking;
          this.alertService.show('success', this.translate.instant(
            revoking ? 'SETTING_PAGE.REVOKED' : 'SETTING_PAGE.RESTORED'));
        } else {
          this.alertService.show('warning', this.accessMessage(outcome));
        }
        this.cdr.markForCheck();
      },

      error: () => {
        this.blockingUid = null;
        this.alertService.show('error', this.translate.instant('SETTING_PAGE.ACCESS_FAILED'));
        this.cdr.markForCheck();
      },
    });
  });
}

private accessMessage(code: string | undefined): string {
  const known: Record<string, string> = {
    NOT_YOURSELF: 'SETTING_PAGE.NOT_YOURSELF',
    NOT_ROOT: 'SETTING_PAGE.NOT_ROOT',
    NOT_FOUND: 'SETTING_PAGE.USER_NOT_FOUND',
    MISSING_DATA: 'SETTING_PAGE.ACCESS_FAILED',
  };
  return this.translate.instant(known[code ?? ''] ?? 'SETTING_PAGE.ACCESS_FAILED');
}

/**
 * Opens the role dialog. Its old name promised a view, and the button said
 * so - but nothing here views anything. It loads the roles this branch may
 * grant and asks which of them this person holds.
 */
onAssignRole(user: UserTableData): void {

  this.userService.findUserByUID(user.uid).subscribe({

    next: (userRes) => {

      this.userRoles = Array.isArray(userRes.data)
        ? userRes.data
        : [userRes.data];

      const currentRoleUIDs = this.userRoles
        .map((userRole: any) => userRole?.roleUID)
        .filter(Boolean);

      this.userService.findRoleByBranch().subscribe({

        next: (roleRes) => {

          const assignableRoleNames = this.getAssignableRoleNames();
          const allRoles = roleRes.data || [];

          // Only offer roles the viewer is allowed to grant - but never
          // hide a role the user already has, otherwise saving would
          // silently strip a role the viewer isn't even allowed to touch.
          this.roles = allRoles.filter((role: any) =>
            assignableRoleNames.includes(role.name) ||
            currentRoleUIDs.includes(role.uid)
          );

          this.selectedRoleUIDs = this.roles
            .filter((role: any) => currentRoleUIDs.includes(role.uid))
            .map((role: any) => role.uid);

          this.openRoleDialog(user);

          this.cdr.markForCheck();
        },

        error: (err) => {
          console.error('Error fetching roles:', err);
        }
      });

      this.cdr.markForCheck();
    },

    error: (err) => {
      console.error('Error fetching user roles:', err);
    }
  });
}

openRoleDialog(user: UserTableData): void {

  const dialogRef = this.dialog.open(UserRoleDialogComponent, {
    width: '500px',
    maxWidth: '95vw',
    autoFocus: false,

    data: {
      user: user,
      roles: this.roles,
      selectedRoleUIDs: [...this.selectedRoleUIDs]
    }
  });

  dialogRef.afterClosed().subscribe(result => {

    if (result) {

      const assignUserRoleDTO: AssignUserRoleDTO = {
        userUID: result.userUID,
        roleUIDS: result.roleUIDs
      };

      this.userService.assignOrUnAssignUserRole(assignUserRoleDTO).subscribe({

        next: (res) => {
          if (res.data) {
            this.alertService.show('success', 'Role Assigned');
            this.findUserPageByBranch();
            this.cdr.markForCheck();
          }
        },

        error: (err) => {
          this.alertService.show('error', err?.error?.message || 'Failed to update role');
        }
      });
    }
  });
}

}
