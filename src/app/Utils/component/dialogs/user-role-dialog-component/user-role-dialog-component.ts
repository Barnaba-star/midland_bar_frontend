import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-user-role-dialog-component',
  imports: [MatDialogModule, MatInputModule, MatAutocompleteModule, MatSelectModule, FormsModule, CommonModule, TranslatePipe, MatIconModule],
  templateUrl: './user-role-dialog-component.html',
  styleUrl: './user-role-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserRoleDialogComponent {
  roles: any[] = [];
  selectedRoleUIDs: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<UserRoleDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: any
  ) {

    this.roles = data.roles || [];

    this.selectedRoleUIDs = [
      ...(data.selectedRoleUIDs || [])
    ];
  }

  // The roles the user currently holds, in the same order as the role
  // list, so they can be dropped one by one without hunting through the
  // dropdown. Removing here only takes effect once Save is pressed.
  get assignedRoles(): any[] {
    return this.roles.filter(role => this.selectedRoleUIDs.includes(role.uid));
  }

  remove(roleUID: string): void {
    this.selectedRoleUIDs = this.selectedRoleUIDs.filter(uid => uid !== roleUID);
  }

  save(): void {

    this.dialogRef.close({
      userUID: this.data.user.uid,
      roleUIDs: this.selectedRoleUIDs
    });
  }

  cancel(): void {

    this.dialogRef.close();
  }
}

