import { localDate } from '../../../services/local-date';
import { ChangeDetectorRef, Component, OnInit, ChangeDetectionStrategy, Inject, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';

@Component({
  selector: 'app-select-staff-dialog-component',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './select-staff-dialog-component.html',
  styleUrl: './select-staff-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectStaffDialogComponent implements OnInit {

  staffList: any[] = [];
  filteredStaffList: any[] = [];
  searchTerm = '';
  loading = false;
  errorMessage: string | null = null;

  /**
   * The roles the caller is allowed to hand out. Passed in rather than
   * fetched here because every screen that opens this dialog has already
   * loaded them - and because what a STAFF member may grant is narrower
   * than the full list.
   */
  roles: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<SelectStaffDialogComponent>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) data: { roles?: any[] } | null,
  ) {
    this.roles = data?.roles ?? [];
  }

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {

    this.loading = true;
    this.errorMessage = null;

    this.barService.findBarStaffList().subscribe({

      next: (res) => {
        this.loading = false;
        this.staffList = res.data || [];
        this.applyFilter();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load staff';
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter(): void {

    const term = this.searchTerm.trim().toLowerCase();

    this.filteredStaffList = !term
      ? this.staffList
      : this.staffList.filter((staff) =>
          [staff.firstName, staff.middleName, staff.lastName, staff.phoneNumber]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
  }

  fullName(staff: any): string {
    return [staff.firstName, staff.middleName, staff.lastName]
      .filter(Boolean)
      .join(' ');
  }

  // Step 2: the picked staff's particulars, pre-filled and editable. Staff
  // records carry no email or address, so those start empty and are filled
  // in here before the user is created. "Enter manually" opens the same
  // form with nothing picked.
  step: 'pick' | 'details' = 'pick';
  form: any = {};

  select(staff: any): void {
    this.form = {
      uid: staff.uid,
      firstName: staff.firstName ?? '',
      middleName: staff.middleName ?? '',
      lastName: staff.lastName ?? '',
      gender: staff.gender ?? '',
      dateOfBirth: this.asDateInput(staff.dateOfBirth),
      phoneNumber: staff.phoneNumber ?? '',
      email: '',
      address: '',
      role: '',
    };
    this.step = 'details';
  }

  enterManually(): void {
    this.form = {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      phoneNumber: '',
      email: '',
      address: '',
      role: '',
    };
    this.step = 'details';
  }

  back(): void {
    this.step = 'pick';
  }

  get canSave(): boolean {
    return !!(
      this.form.firstName?.trim() &&
      this.form.lastName?.trim() &&
      // An account with no role can open nothing at all, so registering
      // without one only produces somebody who cannot work yet.
      (this.roles.length === 0 || this.form.role)
    );
  }

  save(): void {
    if (!this.canSave) {
      return;
    }
    this.dialogRef.close({ ...this.form });
  }

  // <input type="date"> wants yyyy-MM-dd; the API may send a full date-time.
  private asDateInput(value: any): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    // A plain yyyy-MM-dd is already the day; a date-time is read in local time.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return isNaN(date.getTime()) ? String(value) : localDate(date);
  }

  close(): void {
    this.dialogRef.close();
  }
}
