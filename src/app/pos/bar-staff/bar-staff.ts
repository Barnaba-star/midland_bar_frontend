import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, Title2 } from '../../Utils/component/title2/title2';
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormField } from '../../Utils/models/form-field';
import { Form3 } from '../../Utils/component/form3/form3';
import { BarStaffDTO, BarStaffEntity } from '../BarModel';
import { BarService } from '../bar-service/bar-service';
import { ServiceBarMethod } from '../service-bar-method';
import { AlertService } from '../../Utils/services/alert';
import { RecordtableComponent } from '../../Utils/component/recordtable/recordtable';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { MatDialog } from '@angular/material/dialog';
import { PageableParam } from '../../Utils/models/responces';
import { TableColumn, TableComponent } from '../../Utils/component/table/table';
import { MatTableDataSource } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StaffDetailsDialogComponent } from '../../Utils/component/dialogs/staff-details-dialog-component/staff-details-dialog-component';
import { DeleteConfirmationComponent } from '../../Utils/component/dialogs/delete-confirmation-component/delete-confirmation-component';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';

/** Stored as the backend's StaffCategory names. */
export const STAFF_CATEGORY_OPTIONS = [
  { value: 'WAITER', label: 'STAFF_FORM.CAT_WAITER' },
  { value: 'BARTENDER', label: 'STAFF_FORM.CAT_BARTENDER' },
  { value: 'COOK', label: 'STAFF_FORM.CAT_COOK' },
  { value: 'CASHIER', label: 'STAFF_FORM.CAT_CASHIER' },
  { value: 'SECURITY', label: 'STAFF_FORM.CAT_SECURITY' },
  { value: 'CLEANER', label: 'STAFF_FORM.CAT_CLEANER' },
];

/** Icon per category, for the staff table. */
export const STAFF_CATEGORY_ICONS: Record<string, string> = {
  WAITER: 'room_service',
  BARTENDER: 'local_bar',
  COOK: 'restaurant',
  CASHIER: 'point_of_sale',
  SECURITY: 'security',
  CLEANER: 'cleaning_services',
};

const GENDER_OPTIONS = [
  { label: 'STAFF_FORM.MALE', value: 'Male' },
  { label: 'STAFF_FORM.FEMALE', value: 'Female' },
];

@Component({
  selector: 'app-bar-staff',
  standalone: true,
  imports: [
    EmptyStateComponent,
    Title2,
    MatIconModule,
    Form3,
    RecordtableComponent,
    TranslatePipe,
    MatTooltipModule,
  ],
  templateUrl: './bar-staff.html',
  styleUrl: './bar-staff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarStaff implements OnInit{
  constructor(
    private visibility: Authentication,
    private barService: ServiceBarMethod,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private translate: TranslateService,
  ) {}
  ngOnInit(): void {
    this.selectedStaff = 'STAFF.MANAGE';
    this.loadStaffPage();
  }

  selectedStaff = '';
  editBarStaff: Boolean = false;

  titleActions: TitleAction[] = [
    {
      icon: 'add',
      title: 'STAFF.ADD',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
    {
      icon: 'more',
      title: 'STAFF.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'],
    },
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.selectedStaff = action;
    if (this.selectedStaff === 'STAFF.ADD') {
      // The table of just-saved staff stays until Add Staff is pressed
      // again; then it closes and the form comes back empty.
      this.barStaff = [];
      this.cdr.detectChanges();
    }
    if (this.selectedStaff === 'STAFF.MANAGE') {
      this.loadStaffPage();
  
    }
  }

  staffFields: FormField[] = [
    {
      name: 'staffCode',
      type: 'text',
      label: 'STAFF_FORM.STAFF_CODE',
      placeholder: 'STAFF_FORM.STAFF_CODE_PH',
    },
    {
      name: 'firstName',
      type: 'text',
      label: 'STAFF_FORM.FIRST_NAME',
      placeholder: 'STAFF_FORM.FIRST_NAME',
      required: true,
    },
    {
      name: 'middleName',
      type: 'text',
      label: 'STAFF_FORM.MIDDLE_NAME',
      placeholder: 'STAFF_FORM.OPTIONAL',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'STAFF_FORM.LAST_NAME',
      placeholder: 'STAFF_FORM.LAST_NAME',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'STAFF_FORM.PHONE',
      placeholder: 'STAFF_FORM.PHONE_PH',
      required: true,
    },
    {
      name: 'barCategory',
      label: 'STAFF_FORM.CATEGORY',
      placeholder: 'STAFF_FORM.CATEGORY',
      type: 'select',
      required: true,
      options: STAFF_CATEGORY_OPTIONS,
    },
    {
      label: 'STAFF_FORM.DOB',
      name: 'dateOfBirth',
      placeholder: 'STAFF_FORM.DOB',
      type: 'date',
    },
    {
      name: 'description',
      label: 'STAFF_FORM.DESCRIPTION',
      placeholder: 'STAFF_FORM.OPTIONAL',
      type: 'textarea',
      rows: 1,
      colSpan: 2,
    },
    {
      name: 'gender',
      label: 'STAFF_FORM.GENDER',
      type: 'radio',
      options: GENDER_OPTIONS,
    },
  ];

  editStaffFields: FormField[] = [
    {
      name: 'staffCode',
      type: 'text',
      label: 'STAFF_FORM.STAFF_CODE',
      placeholder: 'STAFF_FORM.STAFF_CODE_PH',
    },
    {
      name: 'firstName',
      type: 'text',
      label: 'STAFF_FORM.FIRST_NAME',
      placeholder: 'STAFF_FORM.FIRST_NAME',
      required: true,
    },
    {
      name: 'middleName',
      type: 'text',
      label: 'STAFF_FORM.MIDDLE_NAME',
      placeholder: 'STAFF_FORM.OPTIONAL',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'STAFF_FORM.LAST_NAME',
      placeholder: 'STAFF_FORM.LAST_NAME',
      required: true,
    },
    {
      name: 'phoneNumber',
      type: 'text',
      label: 'STAFF_FORM.PHONE',
      placeholder: 'STAFF_FORM.PHONE_PH',
      required: true,
    },
    {
      name: 'barCategory',
      label: 'STAFF_FORM.CATEGORY',
      placeholder: 'STAFF_FORM.CATEGORY',
      type: 'select',
      required: true,
      options: STAFF_CATEGORY_OPTIONS,
    },
    {
      label: 'STAFF_FORM.DOB',
      name: 'dateOfBirth',
      placeholder: 'STAFF_FORM.DOB',
      type: 'date',
    },
    {
      name: 'description',
      label: 'STAFF_FORM.DESCRIPTION',
      placeholder: 'STAFF_FORM.OPTIONAL',
      type: 'textarea',
      rows: 1,
      colSpan: 2,
    },
    {
      name: 'gender',
      label: 'STAFF_FORM.GENDER',
      type: 'radio',
      options: GENDER_OPTIONS,
    },
  ];

  barStaff: BarStaffEntity[] = [];
  barStaffEdited: BarStaffEntity[] = [];
  staffColumns = [
    {
      field: 'firstName',
      header: 'STAFF_FORM.FIRST_NAME',
    },
    {
      field: 'middleName',
      header: 'STAFF_FORM.MIDDLE_NAME',
    },
    {
      field: 'lastName',
      header: 'STAFF_FORM.LAST_NAME',
    },
    {
      field: 'phoneNumber',
      header: 'STAFF_FORM.PHONE',
    },
    {
      field: 'barCategory',
      header: 'STAFF_FORM.CATEGORY',
    },
    {
      field: 'gender',
      header: 'STAFF_FORM.GENDER',
    },
  ];

  savedData(value: any): void {
    const barStaffDTO: BarStaffDTO = {
      staffCode: value.staffCode,
      firstName: value.firstName,
      middleName: value.middleName,
      lastName: value.lastName,
      dateOfBirth: value.dateOfBirth,
      phoneNumber: value.phone,
      barCategory: value.barCategory,
      description: value.description,
      gender: value.gender,
    };
    console.log('BarStaffDTO:', barStaffDTO);
    this.barService.saveBarStaff(barStaffDTO).subscribe({
      next: (response) => {
        console.log('Bar staff saved successfully:', response);
        if (response.data) {
          this.alertService.show('success', this.translate.instant('STAFF_FORM.SAVED'));
          this.barStaff.push(response.data);
          this.cdr.detectChanges();
          console.log('Saved Bar Staff:', this.barStaff);
        }
      },
      error: (error) => {
        console.error('Error saving bar staff:', error);
      },
    });
  }
  staffUID: string = '';
  onEditBarStaff(event: any) {
    this.staffUID = event.uid;
    console.log('Edited Data:', event);
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '1200px',
      data: {
        formTitle: 'STAFF_FORM.EDIT_TITLE',
        fields: this.editStaffFields,
        formData: [event],
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      console.log('Updated form data:', result);
      const staffEdited: BarStaffDTO = {
        uid: this.staffUID,
        staffCode: result.staffCode,
        firstName: result.firstName,
        middleName: result.middleName,
        lastName: result.lastName,
        dateOfBirth: result.dateOfBirth,
        phoneNumber: result.phoneNumber,
        barCategory: result.barCategory,
        description: result.description,
        gender: result.gender,
      };
      this.barService.saveBarStaff(staffEdited).subscribe({
        next: (response) => {
          console.log('Bar staff Updated successfully:', response);
          if (response.data) {
            this.alertService.show('success', this.translate.instant('STAFF_FORM.UPDATED'));
            this.barStaff = [];
            this.barStaff.push(response.data);
            this.cdr.detectChanges();
            console.log('Saved Bar Staff:', this.barStaff);
          }
        },
        error: (error) => {
          console.error('Error saving bar staff:', error);
        },
      });
    });
  }

  onMoreBarStaff(event: any) {}

  onDeleteBarStaff(event: any): void {

    this.staffUID = event.uid;

    this.translate.get([
      'STAFF_PAGE.DELETE_TITLE',
      'COMMON.CONFIRM_DELETE',
      'COMMON.DELETE',
      'COMMON.CANCEL',
    ]).subscribe(translations => {

      const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: translations['STAFF_PAGE.DELETE_TITLE'],
          message: translations['COMMON.CONFIRM_DELETE'],
          itemName: `${event.firstName || ''} ${event.lastName || ''}`.trim(),
          confirmText: translations['COMMON.DELETE'],
          cancelText: translations['COMMON.CANCEL'],
        },
      });

      dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.onConfirmDelete();
        }
      });
    });
  }

  onConfirmDelete() {
    this.barService.deleteBarStaff(this.staffUID).subscribe({
      next: (response) => {
        console.log('Delete response:', response);
        if (response.data) {
          this.alertService.show('success', this.translate.instant('STAFF_FORM.DELETED'));
          this.barStaff = this.barStaff.filter((staff) => staff.uid !== this.staffUID);
          this.barStaffEdited = [];
          this.cdr.detectChanges();
          console.log('Remaining staff:', this.barStaff);
        }
      },

      error: (error) => {
        console.error('Error on deleting staff:', error);
        this.alertService.show('error', this.translate.instant('STAFF_FORM.DELETE_FAILED'));
      },
    });
  }

  /**
   *******************************************************************************.   LIST STAFF METHOD.    ***********************************************************************
   */
  pageParam: PageableParam = {
    page: 0,
    size: 10,
  };

  readonly categoryOptions = STAFF_CATEGORY_OPTIONS;
  readonly categoryIcons = STAFF_CATEGORY_ICONS;

  /** Matched against any name or the phone number. */
  searchTerm = '';
  /** A StaffCategory name, or '' for all. */
  categoryFilter = '';
  private searchTimer?: ReturnType<typeof setTimeout>;

  get filtering(): boolean {
    return !!this.searchTerm || !!this.categoryFilter;
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    // Wait for a pause in typing rather than asking the backend per keystroke.
    this.searchTimer = setTimeout(() => {
      this.searchTerm = value.trim();
      this.pageParam.page = 0;
      this.loadStaffPage();
    }, 300);
  }

  clearSearch(input: HTMLInputElement) {
    input.value = '';
    clearTimeout(this.searchTimer);
    this.searchTerm = '';
    this.pageParam.page = 0;
    this.loadStaffPage();
  }

  onCategoryFilter(event: Event) {
    this.categoryFilter = (event.target as HTMLSelectElement).value;
    this.pageParam.page = 0;
    this.loadStaffPage();
  }

  categoryLabel(category: string): string {
    return STAFF_CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category;
  }
  barStaffPage: BarStaffEntity[] = [];
  barStaffDataSource = new MatTableDataSource<any>([]);
  staffColumnsPage: TableColumn[] = [
    {
      field: 'firstName',
      header: 'STAFF_FORM.FIRST_NAME',
      icon: 'person2',
      iconPosition: 'left',
      iconColor: '#198754',
    },
    {
      field: 'middleName',
      header: 'STAFF_FORM.MIDDLE_NAME',
    },
    {
      field: 'lastName',
      header: 'STAFF_FORM.LAST_NAME',
    },
    {
      field: 'phoneNumber',
      header: 'STAFF_FORM.PHONE',
      icon: 'more',
      iconPosition: 'left',
      iconColor: '#0d6efd',
    },
    {
      field: 'gender',
      header: 'STAFF_FORM.GENDER',
      cellColors: {
        Male: {
          background: '#e7f1ff',
          color: '#0d6efd',
        },
        Female: {
          background: '#fce7f3',
          color: '#d63384',
        },
      },
    },
    {
      field: 'barCategory',
      header: 'STAFF_FORM.CATEGORY',
      cellColors: {
        WAITER: { background: '#e7f1ff', color: '#0d6efd' },
        BARTENDER: { background: '#f3e8ff', color: '#7c3aed' },
        COOK: { background: '#fff3cd', color: '#856404' },
        CASHIER: { background: '#e8f5e9', color: '#198754' },
        SECURITY: { background: '#f2f4f7', color: '#344054' },
        CLEANER: { background: '#e0f7fa', color: '#00838f' },
      },
    },
  ];


totalElements = 0;
totalPages = 0;

loadStaffPage() {
  this.pageParam.searchParam = this.searchTerm || undefined;
  this.pageParam.filter = this.categoryFilter || undefined;
  this.barService.findBarStaffPage(this.pageParam).subscribe({
    next: (response) => {
      if (response.data) {
        this.barStaffDataSource.data = response.data;

        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;

        this.cdr.detectChanges();

        console.log('Staff Data:', this.barStaffDataSource.data);
      }
    },

    error: (error) => {
      console.error('Error Occurred', error);
    }
  });
}

  onViewStaff(staff: any): void {

    this.dialog.open(StaffDetailsDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: staff,
    });
  }

  staffPageUID: string = '';
  onEditBarStaffPage(event: any) {
    this.staffPageUID = event.uid;
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '1200px',
      data: {
        formTitle: 'STAFF_FORM.EDIT_TITLE',
        fields: this.editStaffFields,
        formData: [event],
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // console.log('Edited Data', result);
        const barStaffDTO: BarStaffDTO = {
          uid: this.staffPageUID,
          staffCode: result.staffCode,
          firstName: result.firstName,
          middleName: result.middleName,
          lastName: result.lastName,
          description: result.description,
          gender: result.gender,
          dateOfBirth: result.dateOfBirth,
          barCategory: result.barCategory,
          phoneNumber: result.phoneNumber,
        };
        this.barService.saveBarStaff(barStaffDTO).subscribe({
          next: (res) => {
            if (res) {
              console.log('Edited Data', res.data);
              const index = this.barStaffDataSource.data.findIndex(
                (staff) => staff.uid === this.staffPageUID,
              );
              if (index != -1) {
                this.barStaffDataSource.data[index] = res.data;
                this.barStaffDataSource.data = [...this.barStaffDataSource.data];
                this.alertService.show('success', this.translate.instant('STAFF_FORM.UPDATED'));
                this.cdr.detectChanges();
                this.staffPageUID = '';
              }
            }
          },
          error: (error) => {
            console.error('Error Occurred', error);
          },
        });
      }
    });
  }

  onDeleteBarStaffPage(event: any) {

    this.staffPageUID = event.uid;

    this.translate.get([
      'STAFF_PAGE.DELETE_TITLE',
      'COMMON.CONFIRM_DELETE',
      'COMMON.DELETE',
      'COMMON.CANCEL',
    ]).subscribe(translations => {

      const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
        width: '420px',
        disableClose: true,
        data: {
          title: translations['STAFF_PAGE.DELETE_TITLE'],
          message: translations['COMMON.CONFIRM_DELETE'],
          itemName: `${event.firstName || ''} ${event.lastName || ''}`.trim(),
          confirmText: translations['COMMON.DELETE'],
          cancelText: translations['COMMON.CANCEL'],
        },
      });

      dialogRef.afterClosed().subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.onConfirmDeleteStaffPage();
        }
      });
    });
  }

  onConfirmDeleteStaffPage() {
    this.barService.deleteBarStaff(this.staffPageUID).subscribe({
      next: (res) => {
        if (res.data) {
          console.log('Deleted Data', res.data);
          const index = this.barStaffDataSource.data.findIndex( (staff) => staff.uid === res.data.uid);
          if (index !== -1) {
            this.barStaffDataSource.data.splice(index, 1);
            this.barStaffDataSource.data = [...this.barStaffDataSource.data];
            this.cdr.detectChanges();
            this.alertService.show('success', this.translate.instant('STAFF_FORM.DELETED'))
          }
        }
      },
      error: (error) => {
        console.error('Error in Deleting Staff', error);
      },
    });
  }
 changePage(page: number) {

  if (page < 0 || page >= this.totalPages) {
    return;
  }

  this.pageParam.page = page;

  this.loadStaffPage();
}

changePageSize(event: Event) {

  const value = (event.target as HTMLSelectElement).value;

  this.pageParam.size = Number(value);

  // Rudi page ya kwanza
  this.pageParam.page = 0;

  this.loadStaffPage();
}
goToPage(page: number) {

  if (page < 0 || page >= this.totalPages) {
    return;
  }

  this.pageParam.page = page;

  this.loadStaffPage();
}


}

