import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, TitleComponent } from '../../Utils/component/title/title.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Authentication } from '../../Utils/services/authentication';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormField } from '../../Utils/models/form-field';
import { AssignUserRoleDTO, ProfilePicDTO, User, UserAndAttachmentDTO, UserDTO } from './user-model';
import { FormComponent } from '../../Utils/component/form/form';
import { UserService } from './user-service';
import { MatDivider } from '@angular/material/divider';
import { ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { FormTWO } from '../../Utils/component/form-two/form-two';
import { PageableParam } from '../../Utils/models/responces';
import { error } from 'console';
import { TableComponent } from '../../Utils/component/table/table';
import { Title2 } from '../../Utils/component/title2/title2';
import { DeleteDialogComponent } from '../../Utils/component/delete-dialog/delete-dialog';
import { ConfirmDeleteDialogComponent } from '../../Utils/component/dialogs/confirm-delete-dialog-component/confirm-delete-dialog-component';
import { DeleteConfirmationComponent } from '../../Utils/component/dialogs/delete-confirmation-component/delete-confirmation-component';
import { UserProfileDialogComponent } from '../../Utils/component/dialogs/user-profile-dialog-component/user-profile-dialog-component';
import { UserRoleDialogComponent } from '../../Utils/component/dialogs/user-role-dialog-component/user-role-dialog-component';
import { AlertService } from '../../Utils/services/alert';
import { SelectStaffDialogComponent } from '../../Utils/component/dialogs/select-staff-dialog-component/select-staff-dialog-component';
import { ActivationCodeDialogComponent } from '../../Utils/component/dialogs/activation-code-dialog-component/activation-code-dialog-component';
import { Service } from '../service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';

@Component({
  selector: 'app-users-setting',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatCardModule,
    MatTableModule,
    MatAutocompleteModule,
    Title2,
    TranslatePipe,
    MatTooltipModule,
    SearchBoxComponent,
  ],
  templateUrl: './users-setting.html',
  styleUrls: ['./users-setting.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersSetting implements OnInit {
  @ViewChild('branchFormComponent') branchFormComponent!: FormTWO;
  @ViewChild('stepper')
  stepper!: MatStepper;
  get currentStep(): number {
    return this.stepper?.selectedIndex + 1 || 1;
  }

  get totalSteps(): number {
    return this.stepper?.steps.length || 0;
  }
  constructor(
    private dialog: MatDialog,
    private visibility: Authentication,
    private fb: FormBuilder,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private alert:AlertService,
    private service:Service,
    private translate: TranslateService
  ) {}
  ngOnInit(): void {
    this.findBranch();
    this.findRoles();
    this.findUsers();
    this.selectedUser='USERS_SETTING_PAGE.MANAGE_TAB'
  }

  selectedUser = '';
  titleActions = [
    { icon: 'manage', title: 'USERS_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER'] },

    { icon: 'manage', title: 'USERS_SETTING_PAGE.ONLINE_TAB', roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER'] }
  ];

  onAction(action: string) {
    this.selectedUser = action;

    switch (action) {
      case 'USERS_SETTING_PAGE.ONLINE_TAB':this.findOnlineUsers();
        break;
      case 'USERS_SETTING_PAGE.MANAGE_TAB':
        this.personalProfile = false;
        this.findUsers();
        break;
    }
  }

  personnelDetails: Boolean = false;
  personalProfile: Boolean = false;
addUser(): void {

  const dialogRef = this.dialog.open(SelectStaffDialogComponent, {
    width: '560px',
    maxWidth: '95vw',
    // The role is picked here, not in a second step - without one the new
    // account can open nothing.
    data: { roles: this.roles },
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
          this.alert.show('success', 'User Added');
          this.showActivationCode(res.data, staff.phoneNumber);
          this.pageIndex = 0;
          this.findUsers();
        } else {
          this.alert.show('error', res.message || 'Failed to add user');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error saving user:', err);
        this.alert.show('error', err?.error?.message || 'Failed to add user');
      }
    });
  });
}

/**
 * An account that has not signed in yet is still holding the one-time code
 * we texted it. This puts a new one on its way - for the message that never
 * arrived, the code that went stale, or the one burned on wrong guesses.
 */
resendingFor: string | null = null;

resendCode(user: any): void {

  if (!user?.uid || this.resendingFor) {
    return;
  }

  this.resendingFor = user.uid;

  this.userService.resendActivationCode(user.uid).subscribe({

    next: (res) => {

      this.resendingFor = null;

      // The backend answers in codes; the wording is ours, and translated.
      const outcome = res?.data;

      if (outcome === 'SENT') {
        this.alert.show('success', this.translate.instant('USERS_SETTING_PAGE.CODE_SENT'));
        // The clock restarted, so the row's own reading of it has to move
        // with it rather than wait for a refresh.
        user.activationExpiresAt = new Date().toISOString();
      } else if (outcome === 'ALREADY_ACTIVATED' || res?.message === 'ALREADY_ACTIVATED') {
        this.alert.show('warning', this.translate.instant('USERS_SETTING_PAGE.CODE_ALREADY_ACTIVATED'));
      } else if (outcome === 'NO_PHONE' || res?.message === 'NO_PHONE') {
        this.alert.show('warning', this.translate.instant('USERS_SETTING_PAGE.CODE_NO_PHONE'));
      } else {
        this.alert.show('error', this.translate.instant('USERS_SETTING_PAGE.CODE_FAILED'));
      }

      this.cdr.markForCheck();
    },

    error: () => {
      this.resendingFor = null;
      this.alert.show('error', this.translate.instant('USERS_SETTING_PAGE.CODE_FAILED'));
      this.cdr.markForCheck();
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

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  //******************************************************************************************* CREATE USER***************************************************/
  user: User[] = [];

  userParticularFields: FormField[] = [
    {
      name: 'firstName',
      type: 'text',
      placeholder: 'Enter first name',
      required: true,
    },
    {
      name: 'middleName',
      type: 'text',
      placeholder: 'Enter middle name',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      placeholder: 'Enter last name',
      required: true,
    },

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

    {
      name: 'dob',
      type: 'date',
      placeholder: 'DOB',
      required: true,
    },
     {
      name: 'email',
      type: 'text',
      placeholder: 'Enter email address',
      required: true,
    },
      {
      name: 'address',
      type: 'text',
      placeholder: 'Enter  address',
      required: true,
    },

    {
      name: 'phone',
      type: 'number',
      placeholder: 'Enter phone number',
      required: true,
    },
    {
      name: 'branch',
      type: 'select',
      placeholder: 'Select Branch',
      rows: 4,
      required: false,
      options: [],
    },
  ];


  userParticularForm!: FormGroup;
  userOtherForm!: FormGroup;
  savedData() {
    const formData = new FormData();
    formData.append('file', this.userOtherForm.value.profileImage!);
    this.userService.saveProfilePic(formData).subscribe({
      next: (res) => {
        if (res) {
          console.log('Profile Picture', res.data);
          const profilePicDto: ProfilePicDTO = {
            imageName: res.data.imageName,
            type: res.data.path,
            path: res.data.path,
          };

          const userDto: UserDTO = {
            firstName: this.userParticularForm.value.firstName,
            middleName: this.userParticularForm.value.middleName,
            lastName: this.userParticularForm.value.lastName,
            dob: this.userParticularForm.value.dob,
            gender: this.userParticularForm.value.gender,
            email: this.userOtherForm.value.email,
            address: this.userOtherForm.value.address,
            phone: this.userOtherForm.value.phone,
            role: this.userOtherForm.value.role,
            branch: this.userOtherForm.value.branch,
            profileImage: this.userOtherForm.value.profileImage,
          };
          console.log('user dto', userDto);
          const userAndAttachmentDto: UserAndAttachmentDTO = {
            profilePicDTO: profilePicDto,
            userDTO: userDto,
          };
          if (userAndAttachmentDto) {
            this.userService.saveUser(userAndAttachmentDto).subscribe({
              next: (res) => {
                console.log('User and Attachment', res);
              },
              error: (err) => {
                console.error(err);
              },
            });
          }
        }
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  findRoles() {
    this.userService.findRoles().subscribe({
      next: (response) => {
        console.log('Roles Found', response.data);
        const optionsForRole = response.data?.map((item: any) => ({
          label: item.name,
          value: item.uid,
        }));
        const roleField = this.userParticularFields.find((f) => f.name === 'role');
        if (roleField) {
          roleField.options = optionsForRole;
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.log('Roles Found', error);
      },
    });
  }

  findBranch() {
    this.userService.findBranchList().subscribe({
      next: (res) => {
        console.log('Branch or Nodes Found', res.data);
        const optionsForBranch = res.data?.map((item: any) => ({
          label: item.name,
          value: item.uid,
        }));
        const branchField = this.userParticularFields.find((f) => f.name === 'branch');
        if (branchField) {
          branchField.options = optionsForBranch;
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.log('Roles Found', error);
      },
    });
  }

  tableConfig = {
    displayedColumns: ['firstName', 'lastName', 'email', 'middleName', 'gender'],
    columnHeaderMap: {
      firstName: 'FIRST NAME',
      middleName: 'MIDDLE NAME',
      lastName: 'LAST NAME',
      email: 'EMAIL',
      gender: 'GENDER',
    },
  };

users: any[] = [];

pageIndex = 0;
pageSize = 5;
totalElements = 0;
searchTerm = '';

findUsers(): void {

  const params: PageableParam = {
    searchParam: this.searchTerm,
    page: this.pageIndex,
    size: this.pageSize,
    sortBy: 'createdAt',
    direction: 'DESC',
  };

  this.userService.findUsers(params).subscribe({

    next: (res) => {

      this.users = res?.data ?? [];
      this.totalElements = res?.totalElements ?? 0;

      console.log('Users Found:', this.users, 'Total:', this.totalElements);

      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error('Error Found:', error);

      this.users = [];
      this.totalElements = 0;

      this.cdr.detectChanges();
    },

  });
}

onPageChange(event: PageEvent): void {

  this.pageIndex = event.pageIndex;
  this.pageSize = event.pageSize;

  this.findUsers();
}

/*
 * Matokeo mapya yana kurasa zake - kubaki page ya zamani kunaweza
 * kuonyesha ukurasa tupu, kwa hiyo tunarudi mwanzo kila utafutaji.
 */
onSearch(term: string): void {

  this.searchTerm = term;
  this.pageIndex = 0;

  this.findUsers();
}


deleteUser(user: any): void {

  this.translate.get([
    'USERS_SETTING_PAGE.DELETE_TITLE',
    'COMMON.CONFIRM_DELETE',
    'COMMON.USER',
    'COMMON.DELETE',
    'COMMON.CANCEL'
  ]).subscribe(translations => {
    this.openDeleteUserDialog(user, translations);
  });
}

private openDeleteUserDialog(user: any, translations: Record<string, string>): void {

const dialogRef = this.dialog.open(
  DeleteConfirmationComponent,
  {
    width: '400px',
    disableClose: true,

    data: {
      title: translations['USERS_SETTING_PAGE.DELETE_TITLE'],
      message: translations['COMMON.CONFIRM_DELETE'],
      itemName:  user?.username || translations['COMMON.USER'],
      confirmText: translations['COMMON.DELETE'],
      cancelText: translations['COMMON.CANCEL']
    }
  }
);


  dialogRef.afterClosed().subscribe((confirmed: boolean) => {

    if (!confirmed) {
      return;
    }

    this.userService.deleteUser(user.uid).subscribe({

      next: (res) => {

        console.log('User Deleted:', res);
        this.alert.show('success', 'User Deleted')

        // ukifuta mtu wa mwisho kwenye ukurasa, rudi ukurasa uliopita
        if (this.users.length === 1 && this.pageIndex > 0) {
          this.pageIndex--;
        }

        this.findUsers();

        this.cdr.markForCheck();

      },

      error: (error) => {

        console.error('Error Deleting User:', error);

      }

    });

  });
}


  profileClick(user: any): void {

  console.log('USER PROFILE:', user);

  this.dialog.open(
    UserProfileDialogComponent,
    {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'user-profile-dialog-panel',
      data: user
    }
  );

}
roles: any[] = [];
userRoles: any[] = [];
selectedRoleUIDs: string[] = [];
moreUser(user: any): void {

  console.log('1. USER:', user);

  this.userService.findRoleByBranch().subscribe({
    next: (roleRes) => {

      this.roles = roleRes.data || [];

      console.log('2. ALL ROLES:', this.roles);

      this.userService.findUserByUID(user.uid).subscribe({
        next: (userRes) => {

          console.log('3. USER RESPONSE:', userRes);

          this.userRoles = Array.isArray(userRes.data)
            ? userRes.data
            : [userRes.data];

          console.log('4. USER ROLES:', this.userRoles);

          this.selectedRoleUIDs = [];

          console.log('5. START COMPARISON');

          for (const role of this.roles) {

            console.log('6. CHECKING ROLE:', role);

            for (const userRole of this.userRoles) {

              console.log(
                '7. COMPARING:',
                role.uid,
                '===',
                userRole?.roleUID
              );

              if (role.uid === userRole?.roleUID) {

                console.log(
                  '8. MATCH FOUND:',
                  role.name
                );

                this.selectedRoleUIDs.push(role.uid);
              }
            }
          }

          console.log(
            '9. SELECTED ROLE UIDS:',
            this.selectedRoleUIDs
          );

          // ============================
          // OPEN DIALOG HERE
          // ============================

          this.openRoleDialog(user);

          this.cdr.markForCheck();

        },

        error: (error) => {
          console.error('USER ROLE ERROR:', error);
        }
      });

      this.cdr.markForCheck();
    },

    error: (error) => {
      console.error('ROLE ERROR:', error);
    }
  });
}



openRoleDialog(user: any): void {

  const dialogRef = this.dialog.open(UserRoleDialogComponent, {
    width: '500px',
    maxWidth: '95vw',
    autoFocus: false,

    data: {
      user: user,
      roles: this.roles,

      // Muhimu: copy array
      selectedRoleUIDs: [...this.selectedRoleUIDs]
    }
  });

  dialogRef.afterClosed().subscribe(result => {

    if (result) {

      console.log('DIALOG RESULT:', result);
      const assignUserRoleDTO:AssignUserRoleDTO={
        userUID:result.userUID,
        roleUIDS:result.roleUIDs
      }
      console.log('ASSIGNED DTO:', assignUserRoleDTO);
      this.userService.assignOrUnAssignUserRole(assignUserRoleDTO).subscribe({
        next:(res)=>{
          if(res.data){
            console.log('Assigned Role', res.data)
            this.alert.show('success', 'Role Assigned')
          }
        }
      })
    }
  });
}


onlineUsers: any[] = [];

findOnlineUsers() {
  this.service.findOnlineUsers().subscribe({
    next: (res) => {

      console.log('FULL RESPONSE:', res);
      console.log('DATA:', res.data);

      this.onlineUsers = res.data ?? [];
      this.cdr.detectChanges();

      console.log('ONLINE USERS ARRAY:', this.onlineUsers);
      console.log('COUNT:', this.onlineUsers.length);
    },

    error: (error) => {
      console.error('Error Occurred:', error);
      this.onlineUsers = [];
      this.cdr.markForCheck();
    }
  });
}



}





