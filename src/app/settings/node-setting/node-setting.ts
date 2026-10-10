import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction } from "../../Utils/component/title/title.component";
import { FormField } from '../../Utils/models/form-field';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from "@angular/material/icon";
import { Authentication } from '../../Utils/services/authentication';
import { BranchDTO } from './NodeModel';
import { Branch } from './NodeModel';
import { NodeService } from './node-service';
import { AlertService } from '../../Utils/services/alert';
import { RecordtableComponent } from "../../Utils/component/recordtable/recordtable";
import { PageableParam } from '../../Utils/models/responces';
import { DeleteDialogComponent } from "../../Utils/component/delete-dialog/delete-dialog";
import { MatStepperModule } from "@angular/material/stepper";
import { FormGroup } from '@angular/forms';
import { FormTWO } from "../../Utils/component/form-two/form-two";
import { MatAnchor } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDivider } from "@angular/material/divider";
import { ViewChild} from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { Title2 } from "../../Utils/component/title2/title2";
import { CommonModule } from '@angular/common';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { error } from 'console';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { UserViewDialogComponent } from '../../Utils/component/dialogs/user-view-dialog-component/user-view-dialog-component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { UserService } from '../users-setting/user-service';
import { AssignUserRoleDTO, UserDTO } from '../users-setting/user-model';
import { SelectUserDialogComponent } from '../../Utils/component/dialogs/select-user-dialog-component/select-user-dialog-component';
import { UserRoleDialogComponent } from '../../Utils/component/dialogs/user-role-dialog-component/user-role-dialog-component';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';
import { BranchDialogComponent } from '../../Utils/component/dialogs/branch-dialog-component/branch-dialog-component';
import { BlockBranchDialogComponent, BlockBranchResult } from '../../Utils/component/dialogs/block-branch-dialog/block-branch-dialog';
import { ActivationCodeDialogComponent } from '../../Utils/component/dialogs/activation-code-dialog-component/activation-code-dialog-component';

@Component({
  selector: 'app-node-setting',
  imports: [MatIconModule,  MatStepperModule,  MatCardModule, Title2, CommonModule, MatPaginator, TranslatePipe, MatTooltipModule, MatMenuModule, SearchBoxComponent],
  templateUrl: './node-setting.html',
  styleUrl: './node-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeSetting implements OnInit{
constructor(private dialog:MatDialog, private visibility:Authentication, private nodeService:NodeService, private alertService:AlertService, private cdr: ChangeDetectorRef, private translate: TranslateService, private userService: UserService) {
  // Resolved once: each call decodes the JWT. The backend checks it again.
  this.canBlock = visibility.hasRole('ROOT')
    || (visibility.getPermissions() || '').split(',').includes('BLOCK_BRANCH');
}

/** Block / Unblock shows only for ROOT or holders of BLOCK_BRANCH. */
readonly canBlock: boolean;

@ViewChild('stepper')
stepper !: MatStepper;
get currentStep():number{
return this.stepper?.selectedIndex + 1 || 1;
}

get totalSteps():number {
  return this.stepper?.steps.length || 0;
}
ngOnInit(): void {
this.selectedNode ='NODE_SETTING_PAGE.MANAGE_BRANCH_TAB'
this.loadBranches();
}

selectedNode = '';
titleActions = [
    { icon: 'more', title: 'NODE_SETTING_PAGE.MANAGE_BRANCH_TAB', roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER'] }
];
onAction(action: string) {
    this.selectedNode = action;
    if(this.selectedNode ==='NODE_SETTING_PAGE.MANAGE_BRANCH_TAB'){

    }
  }

getTitled(title:TitleAction[]):TitleAction[]{
return this.visibility.filteredTitleActions(title);
}
//*************************************** ADD USER TO A BRANCH******************************************************/
// Same user fields as Settings > Users, minus the branch picker - the
// branch is whichever row the button was clicked on.
userFormField: FormField[] = [
  { name: 'firstName', type: 'text', placeholder: 'Enter first name', required: true },
  { name: 'middleName', type: 'text', placeholder: 'Enter middle name', required: true },
  { name: 'lastName', type: 'text', placeholder: 'Enter last name', required: true },
  {
    name: 'gender',
    type: 'select',
    placeholder: 'Gender',
    required: true,
    options: [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
    ],
  },
  { name: 'dob', type: 'date', placeholder: 'DOB', required: true },
  { name: 'email', type: 'text', placeholder: 'Enter email address', required: true },
  { name: 'address', type: 'text', placeholder: 'Enter  address', required: true },
  { name: 'phone', type: 'number', placeholder: 'Enter phone number', required: true },
  // Options are filled in when the dialog opens - see addUserToBranch.
  { name: 'role', type: 'select', placeholder: 'Select role', required: true, options: [] },
];

addUserToBranch(item: any): void {

  // The role is part of registering, not a second step: without one the new
  // account cannot open anything, so they could not start work.
  this.userService.findRoles().subscribe({
    next: (roleRes) => this.openAddUserToBranchDialog(item, roleRes.data || []),
    error: () => this.openAddUserToBranchDialog(item, []),
  });
}

private openAddUserToBranchDialog(item: any, roles: any[]): void {

  const fields = this.userFormField.map(field =>
    field.name === 'role'
      ? { ...field, options: roles.map(role => ({ label: role.name, value: role.uid })) }
      : field
  );

  this.translate.get('NODE_SETTING_PAGE.FORM_TITLE_ADD_USER', { branch: item?.branchName ?? '' })
    .subscribe(formTitle => {

      const dialogRef = this.dialog.open(DialogComponent, {
        width: '1200px',
        data: {
          fields,
          formTitle,
        },
      });

      dialogRef.afterClosed().subscribe(result => {

        if (!result) {
          return;
        }

        const userDTO: UserDTO = {
          firstName: result.firstName,
          middleName: result.middleName,
          lastName: result.lastName,
          email: result.email,
          phone: result.phone,
          dob: result.dob,
          gender: result.gender,
          address: result.address,
          role: result.role,
          branch: item.uid,
        };

        this.userService.saveUser(userDTO).subscribe({
          next: (res) => {
            if (res.data) {
              this.alertService.show('success', 'User Added');
              this.showActivationCode(res.data, result.phone);
            } else {
              this.alertService.show('error', res.message || 'Failed to add user');
            }
          },
          error: (err) => {
            console.error('Error saving user:', err);
            this.alertService.show('error', err?.error?.message || 'Failed to add user');
          },
        });
      });
    });
}

//*************************************** ASSIGN ROLE TO A BRANCH USER******************************************************/
// Pick one of this branch's users, then pick the roles they should hold.
// findAllUsersWithBranchAndRoles already returns each user's current
// roles, so those come back pre-ticked.
assignRoleToBranchUser(item: any): void {

  this.nodeService.findAllUsersWithBranchAndRoles(item.uid).subscribe({

    next: (res) => {

      const users = res.data || [];

      if (users.length === 0) {
        this.alertService.show('error', 'No users in this branch');
        return;
      }

      const selectRef = this.dialog.open(SelectUserDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          users,
          subtitle: item?.branchName,
        },
      });

      selectRef.afterClosed().subscribe((user) => {
        if (user) {
          this.openRoleDialog(user);
        }
      });
    },

    error: (error) => {
      console.error('Error fetching branch users:', error);
      this.alertService.show('error', 'Error when Fetching Users');
    },
  });
}

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

private openRoleDialog(user: any): void {

  this.userService.findRoles().subscribe({

    next: (roleRes) => {

      const roles = roleRes.data || [];
      const selectedRoleUIDs = (user.roles || []).map((role: any) => role.uid);

      const dialogRef = this.dialog.open(UserRoleDialogComponent, {
        width: '500px',
        maxWidth: '95vw',
        autoFocus: false,
        data: {
          user,
          roles,
          selectedRoleUIDs,
        },
      });

      dialogRef.afterClosed().subscribe(result => {

        if (!result) {
          return;
        }

        const assignUserRoleDTO: AssignUserRoleDTO = {
          userUID: result.userUID,
          roleUIDS: result.roleUIDs,
        };

        this.userService.assignOrUnAssignUserRole(assignUserRoleDTO).subscribe({
          next: (res) => {
            if (res.data) {
              this.alertService.show('success', 'Role Assigned');
            } else {
              this.alertService.show('error', res.message || 'Failed to assign role');
            }
          },
          error: (err) => {
            console.error('Error assigning role:', err);
            this.alertService.show('error', err?.error?.message || 'Failed to assign role');
          },
        });
      });
    },

    error: (error) => {
      console.error('Error fetching roles:', error);
      this.alertService.show('error', 'Error when Fetching Roles');
    },
  });
}

//*************************************** ADD NEW NODE LIST******************************************************/


branchForm ! : FormGroup;
branchDetailForm !: FormGroup;



andBranch:Boolean=false;

onSubmit(event: any): void {
  console.log('Payload:', event);
  const branchDTO:BranchDTO={
    phone:event.phone,
    address:event.address,
    branchCategory:event.branchCategory,
    branchName:event.branchName,
    region:event.region,
    description:event.description,
    status:event.status
  }
  this.saveBranch(branchDTO);
}

openAddBranchDialog(): void {

  const dialogRef = this.dialog.open(BranchDialogComponent, {
    width: '640px',
    maxWidth: '95vw',
    autoFocus: false,
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.onSubmit(result);
    }
  });
}


saveBranch(branchDTO: BranchDTO): void {
  this.nodeService.saveBranch(branchDTO).subscribe({
    next: (response) => {
      if(response.data){

      this.loadBranches();
      this.cdr.detectChanges();
      console.log('branchData', response.data);
      }
    },
    error: (error) => {
      console.error('Failed to save branch', error);
    }
  });
}
branchData = {
  uid: '',
  branchName: '',
  branchCode: '',
  branchType: '',
  branchCategory: '',
  region: '',
  address: '',
  phone: '',
  status: '',
  description: '',
};
columns = [
  { field: 'branchName', header: 'BRANCH NAME' },
  { field: 'branchCode', header: 'BRANCH CODE' },
  { field: 'branchType', header: 'BRANCH TYPE' },
  { field: 'branchCategory', header: 'CATEGORY' },
  { field: 'region', header: 'REGION' },
  { field: 'phone', header: 'PHONE NO' },
  { field: 'status', header: 'STATUS' }
];

tableData: any[] = [];
findBranchByUID(branchUID:string){
this.nodeService.findBranchByUID(branchUID).subscribe({
next:(respose)=>{
      console.log('Branch Data:', respose.data);
    },
error:(error)=>{
    console.error('Error occured ', error);
  }
});
}

  tableConfig = {
    displayedColumns: [
      'branchName',
      'branchCode',
      'branchType',
      'branchCategory',
      'region',
      'phone',
      'status'
    ],
    columnHeaderMap: {
      branchName: 'BRANCH NAME',
      branchCode: 'BRANCH CODE',
      branchType: 'BRANCH TYPE',
      branchCategory: 'BRANCH CATEGORY',
      region: 'REGION',
      phone: 'PHONE NO',
      staus: 'STATUS'
    },
  };
branch: Branch[] = [];
pageIndex = 0;
pageSize = 10;
totalBranches = 0;
searchTerm = '';
loadBranches(): void {

  const params: PageableParam = {

    searchParam: this.searchTerm,

    page: this.pageIndex,

    size: this.pageSize,

    sortBy: 'createdAt',

    direction: 'DESC',
  };

  this.nodeService.findBranchPage(params).subscribe({

    next: (response) => {

      this.branch = response.data || [];

      /*
       * HAPA tunahitaji total number ya records
       * kutoka backend.
       */
      this.totalBranches = response.totalElements || 0;

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Error Occurred',
        error
      );

    }

  });
}
onBranchPageChange(event: PageEvent): void {

  this.pageIndex = event.pageIndex;

  this.pageSize = event.pageSize;

  this.loadBranches();
}

/*
 * Matokeo mapya yana kurasa zake - kubaki page ya zamani kunaweza
 * kuonyesha ukurasa tupu, kwa hiyo tunarudi mwanzo kila utafutaji.
 */
onSearch(term: string): void {

  this.searchTerm = term;

  this.pageIndex = 0;

  this.loadBranches();
}

deleteItem(item: any): void {

  this.translate.get([
    'NODE_SETTING_PAGE.DELETE_TITLE',
    'COMMON.CONFIRM_DELETE'
  ]).subscribe(translations => {
    this.openDeleteDialog(item, translations);
  });
}

private openDeleteDialog(item: any, translations: Record<string, string>): void {

  const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
    width: '450px',
    disableClose: true,
    data: {
      title: translations['NODE_SETTING_PAGE.DELETE_TITLE'],
      message: translations['COMMON.CONFIRM_DELETE'],
      item: item
    }
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result) {
      this.nodeService.deleteBranch(result.uid).subscribe({
        next: (res) => {
          if (res.data) {
            this.branch = this.branch.filter(
              (branch: any) => branch.uid !== result.uid
            );
            this.cdr.detectChanges();
            this.alertService.show('success', 'Branch Deleted');
          }
        },
        error: (error) => {
          console.error('Delete failed:', error);
        }
      });
    }
  });
}



/**
 * Rows hold both "Active" and "ACTIVE" - the old form wrote one casing and
 * something else wrote the other - so an exact match against "Active"
 * showed live branches as inactive. The dialog writes one way now; this
 * reads both, for the rows already stored.
 */
isActive(status: string | null | undefined): boolean {
  return (status || '').trim().toUpperCase() === 'ACTIVE';
}

//*************************************** BLOCK / UNBLOCK A BRANCH ******************************************************/

/** The main office's own branch: it can never be blocked (the backend refuses it too). */
isRootBranch(item: Branch): boolean {
  return (item?.branchCode || '').toUpperCase() === 'ROOT'
    || (item?.branchType || '').toUpperCase() === 'ROOT';
}

/** Older rows carry only status; newer ones carry the flag too. */
isBlocked(item: Branch): boolean {
  return item?.blocked === true || (item?.status || '').trim().toUpperCase() === 'BLOCKED';
}

/** Reason, when and by whom - for the badge's tooltip. */
blockedTooltip(item: Branch): string {
  const lines: string[] = [];
  if (item.blockedReason) {
    lines.push(this.translate.instant('BLOCK_BRANCH.INFO_REASON', { reason: item.blockedReason }));
  }
  if (item.blockedAt) {
    const at = new Date(item.blockedAt);
    const when = isNaN(at.getTime()) ? item.blockedAt : at.toLocaleString();
    lines.push(this.translate.instant('BLOCK_BRANCH.INFO_AT', { at: when }));
  }
  if (item.blockedBy) {
    lines.push(this.translate.instant('BLOCK_BRANCH.INFO_BY', { by: item.blockedBy }));
  }
  return lines.join('\n');
}

toggleBlock(item: Branch): void {

  if (!item?.uid || this.isRootBranch(item)) {
    return;
  }

  const unblock = this.isBlocked(item);

  this.dialog.open(BlockBranchDialogComponent, {
    width: '460px',
    maxWidth: '95vw',
    autoFocus: false,
    data: {
      branchName: item.branchName ?? '',
      branchCode: item.branchCode ?? '',
      unblock,
    },
  }).afterClosed().subscribe((result?: BlockBranchResult) => {

    if (!result) {
      return;
    }

    const body = unblock
      ? { blocked: false }
      : { blocked: true, reason: result.reason || undefined };

    this.nodeService.blockBranch(item.uid!, body).subscribe({
      next: (res) => {
        if (res.data) {
          const index = this.branch.findIndex(b => b.uid === res.data.uid);
          if (index !== -1) {
            this.branch = [
              ...this.branch.slice(0, index),
              res.data,
              ...this.branch.slice(index + 1),
            ];
          }
          this.alertService.show('success', this.translate.instant(
            unblock ? 'BLOCK_BRANCH.UNBLOCKED' : 'BLOCK_BRANCH.BLOCKED', { name: item.branchName ?? '' }));
          this.cdr.detectChanges();
        } else {
          this.alertService.show('error', this.blockErrorMessage(res.message));
        }
      },
      error: (err) => {
        this.alertService.show('error', this.blockErrorMessage(err?.error?.code ?? err?.error?.message));
      },
    });
  });
}

private blockErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'BRANCH_NOT_FOUND': return this.translate.instant('BLOCK_BRANCH.ERR_NOT_FOUND');
    case 'ROOT_BRANCH': return this.translate.instant('BLOCK_BRANCH.ERR_ROOT');
    default: return this.translate.instant('BLOCK_BRANCH.ERR_FAILED');
  }
}

editItem(item: any): void {
  // The dialog carries its own title now, so there is nothing to look up.
  this.openEditDialog(item);
}

private openEditDialog(item: any): void {

  const dialogRef = this.dialog.open(BranchDialogComponent, {
    width: '640px',
    maxWidth: '95vw',
    autoFocus: false,
    data: { branch: item },
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log('Dialog closed with result:', result);
      const brachDTO:BranchDTO={
        uid:result.uid,
        branchName:result.branchName,
        branchCode:result.branchCode,
        branchCategory:result.branchCategory,
        phone:result.phone,
        address:result.address,
        description:result.description,
        status:result.status,
        region:result.region
      }
      this.nodeService.saveBranch(brachDTO).subscribe({
        next:(res)=>{
          if(res.data){
            console.log('Updated Branch', res.data);
            const index = this.branch.findIndex(idx=>idx.uid === res.data.uid);
            if(index !==-1){
              this.branch[index] = res.data;
              this.cdr.detectChanges();
              this.alertService.show('success', 'Branch Updated');
            }
          }
        },
        error:(error)=>{
          this.alertService.show('error', 'Error when Updating Branch');
        }
      })

    }
  });
}


subscriptionFormField: FormField[] = [
  {
    name: 'subscriptionAmount',
    label: 'Subscription Amount (per month)',
    placeholder: 'e.g. 50000',
    type: 'number',
    required: true,
    min: 0
  },
  {
    name: 'closeSubscription',
    label: 'Subscription End Date',
    type: 'date',
    required: true
  }
];

openSubscriptionDialog(item: any): void {

  this.translate.get('NODE_SETTING_PAGE.FORM_TITLE_SUBSCRIPTION').subscribe(formTitle => {

    const dialogRef = this.dialog.open(DialogComponent, {
      width: '600px',
      data: {
        fields: this.subscriptionFormField,
        formTitle,
        formData: {
          subscriptionAmount: item.subscriptionAmount,
          closeSubscription: item.closeSubscription
        },
        uid: item.uid
      }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result) {

        const branchDTO: BranchDTO = {
          uid: item.uid,
          subscriptionAmount: result.subscriptionAmount,
          closeSubscription: result.closeSubscription
        };

        this.nodeService.saveBranchSubscription(branchDTO).subscribe({

          next: (res) => {

            if (res.data) {

              const index = this.branch.findIndex(b => b.uid === res.data.uid);

              if (index !== -1) {
                this.branch[index] = res.data;
                this.cdr.detectChanges();
              }

              this.alertService.show('success', 'Branch Subscription Saved');

            } else {
              this.alertService.show('error', res.message || 'Error when Saving Branch Subscription');
            }
          },

          error: () => {
            this.alertService.show('error', 'Error when Saving Branch Subscription');
          }

        });

      }

    });

  });
}

moreActions(item: any): void {

  console.log('More actions for:', item);

  this.nodeService.findAllUsersWithBranchAndRoles(item.uid).subscribe({

    next: (res) => {

      if (res.data && res.data.length > 0) {

        const user = res.data[0];

        console.log('User:', user);

        this.dialog.open(UserViewDialogComponent, {
          width: '850px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: user,
          panelClass: 'user-view-dialog'
        });

      }

    },

    error: (error) => {
      console.error('Error fetching user:', error);

      this.alertService.show(
        'error',
        'Error when Fetching User'
      );
    }

  });
}





//*************************************** MANAGE NODE LIST******************************************************/
manageNodeFormField:FormField[]=[];
deleteBranchData:Boolean=false;
editBranchData:Boolean=false;
moreBranchData:Boolean=false;
nodeBranchDataUID:string='';
branchObject: Branch = {
  uid: '',
  branchName: '',
  branchCode: '',
  branchType: '',
  branchCategory: '',
  region: '',
  address: '',
  phone: '',
  status: '',
  description: ''
};






}




