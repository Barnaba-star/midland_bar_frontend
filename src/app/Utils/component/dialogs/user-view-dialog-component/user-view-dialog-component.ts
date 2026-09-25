import { CommonModule } from '@angular/common';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-user-view-dialog-component',
  imports: [MatIconModule, CommonModule, TranslatePipe],
  templateUrl: './user-view-dialog-component.html',
  styleUrl: './user-view-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserViewDialogComponent {

  users: any[] = [];

  branch: any = null;


  constructor(

    private dialogRef:
      MatDialogRef<UserViewDialogComponent>,

    @Inject(MAT_DIALOG_DATA)
    public data: any

  ) {

    console.log(
      'Dialog received data:',
      data
    );


    /*
     * Data kutoka parent:
     *
     * {
     *   users: [...]
     * }
     */
this.users = data || [];

if (this.users.length > 0) {
  this.branch = this.users[0]?.branch || null;
}

this.users = data ? [data] : [];

this.branch = data?.branch || null;

console.log('Users:', this.users);
console.log('Branch:', this.branch);



  }


  close(): void {

    this.dialogRef.close();

  }


  getUserInitials(user: any): string {

    const first =
      user?.firstName?.charAt(0) || '';

    const last =
      user?.lastName?.charAt(0) || '';

    return (
      first + last
    ).toUpperCase();

  }


  getUserStatus(user: any): string {

    if (user?.isBlocked) {
      return 'COMMON.BLOCKED';
    }

    if (user?.isActive) {
      return 'COMMON.ACTIVE';
    }

    return 'COMMON.INACTIVE';

  }


  getUserStatusClass(user: any): string {

    if (user?.isBlocked) {
      return 'blocked';
    }

    if (user?.isActive) {
      return 'active';
    }

    return 'inactive';

  }

}
