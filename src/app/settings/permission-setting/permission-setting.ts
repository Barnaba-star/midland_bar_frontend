import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleComponent } from "../../Utils/component/title/title.component";
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatIconModule } from "@angular/material/icon";
import { TitleAction } from "../../Utils/component/title/title.component";
import { Authentication } from '../../Utils/services/authentication';
import { PermissionService } from './permission-service';
import { Role } from '../role-setting/RoleModel';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from "@angular/material/divider";
import { AssignPermissionToRoleDto, Permission } from './permission-model';
import { Title2 } from "../../Utils/component/title2/title2";
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-permission-setting',
  imports: [ MatSelectModule, MatCheckboxModule, MatIconModule, CommonModule, MatFormFieldModule, MatSelectModule, MatDividerModule, Title2, TranslatePipe],
  templateUrl: './permission-setting.html',
  styleUrl: './permission-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionSetting implements OnInit {

  permissions: any[] = [];
  selectedPermission = '';
  titleActions = [
    { icon: 'more', title: 'PERMISSION_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER'] },
  ];

  constructor(
    private dialog: MatDialog,
    private visibility: Authentication,
    private permissionService: PermissionService, private cdr:ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.findRoles();
    this.findDistinctModules()
    this.selectedPermission = 'PERMISSION_SETTING_PAGE.MANAGE_TAB'
  }

  onAction(action: string): void {
    console.log('Selected action:', action);
    this.selectedPermission = action;
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }



roles: Role[] = [];
selectedRoleUid: string = '';

findRoles(): void {
  this.permissionService.findRoles().subscribe({
    next: (response) => {
      this.roles = response?.data || [];
      console.log('Roles Found', this.roles)
      this.cdr.markForCheck();
    }
  });
}
selectRole(roleUid: string): void {
  this.selectedRoleUid = roleUid
  console.log('Selected RoleUID', this.selectedRoleUid)
}

modules:String[]=[];
selectedModule:string='';

findDistinctModules():void{
  this.permissionService.findDistinctModules().subscribe({
  next:(response)=>{
    this.modules = response?.data || [];
  //  console.log('Permissions Found', response);
    this.cdr.markForCheck();

  },
  error:(error)=>{
    console.error('Error in fetchinig Permissions', error);
  }
})
}

onSelectModule(selectedModule: string): void {
  this.selectedModule = selectedModule
  console.log('Selected Role', this.selectedModule)
}



permissionListByRole:Permission []=[];
findPermissionsByRole(roleUID:string):void{
this.permissionService.findPermissionsByRole(roleUID).subscribe({
  next:(response)=>{
    console.log('Permissions Found By Role UIDDD', this.permissionListByRole);
  },
  error:(error)=>{
    console.error('Error found while Fetching Permissions', error)
  }
});
}
permissionByModuleName:Permission []=[];
findPermissionByModuleName(moduleName: string): void {

  this.permissionService
    .findPermissionByModuleName(moduleName)
    .subscribe({

      next: (response) => {

        this.permissionByModuleName = response?.data || [];

        this.groupPermissions();

        this.cdr.detectChanges();

        console.log(
          'Permissions Found By Module Name',
          this.permissionByModuleName
        );

        console.log(
          'Permission Groups',
          this.permissionGroups
        );
      },

      error: (error) => {

        console.error(
          'Error Found When Fetching Permissions',
          error
        );

      }

    });
}


findPermissionByRoleUID(roleUID:string):void{
this.permissionService.findPermissionByRoleUID(roleUID).subscribe({
 next:(response)=>{
    this.permissionListByRole = response?.data  || [];
    this.cdr.detectChanges();
    console.log('Permissions Found By Role UID', this.permissionListByRole);
  },
  error:(error)=>{
    console.error('Error Found When Fetching Permissions', error);
  }
  });
}

showPermissions:Boolean=false;
fetchPermissions():void{
  this.findPermissionByModuleName(this.selectedModule);
  this.findPermissionByRoleUID(this.selectedRoleUid);
  this.cdr.detectChanges();
  this.showPermissions=true;
}

checkIfRoleContainPermission(permission: Permission): boolean {
  if (!permission || !this.permissionListByRole) return false;
  return this.permissionListByRole.some(p => p && p.uid === permission.uid);
}

onPermissionToggle(permission: Permission, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  if (checked) {
    if (!this.permissionListByRole.some(p =>p && p.uid === permission.uid)) {
      this.permissionListByRole.push(permission);
      console.log('Permission added or removed From the List', this.permissionListByRole)
    }
  } else {
    this.permissionListByRole = this.permissionListByRole.filter(p =>p && p.uid !== permission.uid);
    console.log('Permission by Role', this.permissionListByRole)
  }
}

saveRoleAndPermissions(){
const assignPermissionToRoleDto:AssignPermissionToRoleDto={
  roleUID: this.selectedRoleUid,
  permissions: this.permissionListByRole
}

this.permissionService.assignPermissionToRole(assignPermissionToRoleDto).subscribe({
  next: (res)=> {
    if(res){
     // this.alertService.show('success', 'success');
      this.showPermissions=false;
      this.cdr.detectChanges();
      this.selectedModule = '';
      this.selectedRoleUid = '';
      this.permissionByModuleName=[];
      this.permissionListByRole=[];
      this.cdr.detectChanges();
      console.log('Permissions Saved', res.data)
    }
  },
  error: (err)=>{
    console.error('Error occured', err)
  },
});
}

groupPermissions(): void {

  const groups = new Map<string, Permission[]>();

  this.permissionByModuleName.forEach(permission => {

    const groupName = permission.group || 'OTHER';

    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }

    groups.get(groupName)!.push(permission);

  });


  this.permissionGroups = Array.from(
    groups.entries()
  ).map(([name, permissions]) => ({
    name,
    permissions
  }));

}

permissionGroups: {
  name: string;
  permissions: Permission[];
}[] = [];


}
