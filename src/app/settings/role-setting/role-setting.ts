import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction } from "../../Utils/component/title/title.component";
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { FormField } from '../../Utils/models/form-field';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { Authentication } from '../../Utils/services/authentication';
import { NodeService } from '../node-setting/node-service';
import { Role, RoleDTO } from './RoleModel';
import { RoleService } from './role-service';
import { AlertService } from '../../Utils/services/alert';
import { MatTableDataSource } from '@angular/material/table';
import { PageableParam } from '../../Utils/models/responces';
import { LoaderService } from '../../Utils/services/loader-service';
import { Title2 } from "../../Utils/component/title2/title2";
import { Form3 } from '../../Utils/component/form3/form3';
import { error } from 'console';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { Permission } from '../permission-setting/permission-model';
import { RoleDetailsDialogComponent } from '../../Utils/component/dialogs/role-details-dialog-component/role-details-dialog-component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-role-setting',
  imports: [MatIconModule, Title2, DatePipe,UpperCasePipe, MatPaginatorModule, TranslatePipe],
  templateUrl: './role-setting.html',
  styleUrl: './role-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSetting implements OnInit{
constructor(private dialog:MatDialog, private visibility:Authentication, private branchService:NodeService, private roleService:RoleService,
  private alertService:AlertService,
private cdr:ChangeDetectorRef,  private loaderService: LoaderService, private translate: TranslateService) {

  // .get() waits for the translation file to finish loading, unlike
  // .instant() which returns the raw key if called too early.
  this.translate.get('ROLE_SETTING_PAGE.FORM_TITLE_REGISTER').subscribe(text => {
    this.formTitle = text;
    this.cdr.markForCheck();
  });

  this.translate.onLangChange.subscribe(() => {
    this.formTitle = this.translate.instant('ROLE_SETTING_PAGE.FORM_TITLE_REGISTER');
    this.cdr.markForCheck();
  });
}
  ngOnInit(): void {
    this.selectedRoleRole = 'ROLE_SETTING_PAGE.MANAGE_TAB'
    this.loadRoles();
  }
selectedRoleRole = '';
titleActions = [
    { icon: 'manage', title: 'ROLE_SETTING_PAGE.MANAGE_TAB',  roles: ['ROOT', 'STAFF', 'DIRECTOR'] },

];

onAction(action: string) {
    this.selectedRoleRole = action;
    if(this.selectedRoleRole === 'ROLE_SETTING_PAGE.MANAGE_TAB'){
    this.loadRoles();
  }
}

getTitled(title:TitleAction[]):TitleAction[]{
return this.visibility.filteredTitleActions(title);
}

//********************************** ADD NEW ROLE ******************************************************/
roleFormField: FormField[] = [
  {
    name: 'name',
    placeholder: 'Name',
    type: 'text',
    required: true
  },

  {
    name: 'category',
    placeholder: 'Category',
    type: 'select',
    required: true,
    options: [
      { label: 'Bar', value: 'BAR' },
    ]
  },

  {
    name: 'description',
    placeholder: 'Description',
    type: 'textarea',
    required: true
  },
];


formTitle = '';
columns = [
  { field: 'name', header: 'ROLE NAME' },
  { field: 'code', header: 'ROLE CODE' },
  { field: 'category', header: 'CATEGORY' },
  { field: 'status', header: 'STATUS' }
];

roleData: any[] = [];

closeTable(){
  this.roleData=[];
}
manageRoleList:FormField[]=[];

onSaveRole(){
 this.translate.get('ROLE_SETTING_PAGE.FORM_TITLE_ADD').subscribe(formTitle => {
   this.openSaveRoleDialog(formTitle);
 });
}

private openSaveRoleDialog(formTitle: string): void {
 const dialogRef = this.dialog.open(DialogComponent, {
    width: '1200px',
    data: {
      formTitle,
      fields: this.roleFormField,
    },
  });
  dialogRef.afterClosed().subscribe((result)=>{
    if(result){
      const roleDTO:RoleDTO={
        name:result.name,
        category:result.category,
        description:result.description,
      }
      console.log('Data To be Edited', roleDTO)
      this.roleService.saveRole(roleDTO).subscribe({
        next:(respose)=>{
          if(respose.data){
            this.loadRoles();
            console.log('Data From Database', respose.data);
          }
        },
        error:(error)=>{console.error('Error occured while upting role', error)}
      });
    }
  });
}


//********************************************************************************************* FETCH ROLE****************************************************/

role: Role[] = [];

pageIndex = 0;
pageSize = 5;
totalElements = 0;

loadRoles(): void {

  const params: PageableParam = {
    searchParam: '',
    page: this.pageIndex,
    size: this.pageSize,
    sortBy: 'createdAt',
    direction: 'ASC',
  };

  this.roleService.findRolePage(params).subscribe({
    next: (response) => {

      this.role = response.data || [];

      // Badilisha hii kulingana na response yako
      this.totalElements = response.totalElements || 0;

      console.log('Roles:', this.role);
      console.log('Total Elements:', this.totalElements);

      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('Error Found', err);
    }
  });
}

onPageChange(event: PageEvent): void {

  this.pageIndex = event.pageIndex;
  this.pageSize = event.pageSize;

  this.loadRoles();
}

roleDataValue:Role={
  uid: '',
  name: '',
  code: '',
  category:'',
  description: '',
  status: '',
}
editRole(role:Role){
  this.roleDataValue = role;

  this.translate.get('ROLE_SETTING_PAGE.FORM_TITLE_EDIT').subscribe(formTitle => {
    this.openEditRoleDialog(formTitle);
  });
}

private openEditRoleDialog(formTitle: string): void {
  const dialogRef = this.dialog.open(DialogComponent, {
    width: '1200px',
    data: {
      formTitle,
      fields: this.roleFormField,
      formData: [this.roleDataValue],
    },
  });
  dialogRef.afterClosed().subscribe((result)=>{
    if(result){
      const roleDTO:RoleDTO={
        uid:this.roleDataValue.uid,
        name:result.name,
        category:result.category,
        description:result.description,
      }
      console.log('Data To be Edited', roleDTO)
      this.roleService.saveRole(roleDTO).subscribe({
        next:(respose)=>{
          if(respose){
            const index = this.role.findIndex(index=>index.uid===respose.data.uid)
            if(index !==-1){
              this.role[index]=respose.data;
              this.cdr.detectChanges();
              console.log('Data From Database', respose.data);

            }
          }
        },
        error:(error)=>{console.error('Error occured while upting role', error)}
      });
    }
  });


}


deleteRole(role:Role){
  console.log('Role to be Deleted', role)

  this.translate.get([
    'ROLE_SETTING_PAGE.DELETE_TITLE',
    'COMMON.CONFIRM_DELETE'
  ]).subscribe(translations => {
    this.openDeleteRoleDialog(role, translations);
  });
}

private openDeleteRoleDialog(role: Role, translations: Record<string, string>): void {

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: translations['ROLE_SETTING_PAGE.DELETE_TITLE'],
        message: translations['COMMON.CONFIRM_DELETE'],
        item: role
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.roleService.deleteRole(result.uid).subscribe({
          next: (res) => {
            if (res.data) {
              this.role = this.role.filter(
                (role: any) => role.uid !== result.uid
              );
              this.cdr.detectChanges();
              this.alertService.show('success', this.translate.instant('ROLE_SETTING_PAGE.ALERT_DELETED'));
            }
          },
          error: (error) => {
            console.error('Delete failed:', error);
          }
        });
      }
    });
}
selectedRolePermissions: Permission[] = [];
selectedRole: Role | null = null;
showMoreRole = false;


moreRole(role: Role): void {

  console.log('More role in details:', role);

  this.roleService.findRoleAndPermission(role.uid!).subscribe({

    next: (res) => {

      if (res.data && res.data.length > 0) {

        const roleData = res.data[0];

        console.log(
          'Role And Permissions:',
          roleData
        );

        this.dialog.open(RoleDetailsDialogComponent, {

          width: '760px',

          maxWidth: '95vw',

          maxHeight: '90vh',

          panelClass: 'role-details-dialog-panel',

          data: roleData

        });

      }

    },

    error: (error) => {

      console.error(
        'Error loading role details:',
        error
      );

    }

  });
}


}
