import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

// Picks one user out of a list handed in by the caller (e.g. the users of
// one branch). It does no fetching of its own - the caller already knows
// which branch's users these are.
@Component({
  selector: 'app-select-user-dialog-component',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './select-user-dialog-component.html',
  styleUrl: './select-user-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectUserDialogComponent {

  userList: any[] = [];
  filteredUserList: any[] = [];
  searchTerm = '';
  subtitle = '';

  constructor(
    private dialogRef: MatDialogRef<SelectUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    this.userList = data?.users || [];
    this.subtitle = data?.subtitle || '';
    this.applyFilter();
  }

  applyFilter(): void {

    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUserList = !term
      ? this.userList
      : this.userList.filter((user) =>
          [user.firstName, user.middleName, user.lastName, user.username, user.email]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
  }

  fullName(user: any): string {
    return [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(' ');
  }

  select(user: any): void {
    this.dialogRef.close(user);
  }

  close(): void {
    this.dialogRef.close();
  }
}
