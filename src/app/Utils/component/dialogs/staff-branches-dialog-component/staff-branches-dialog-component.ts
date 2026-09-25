import { ChangeDetectorRef, Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { CommissionService } from '../../../../settings/commission-setting/commission-service';
import { StaffBranch } from '../../../../settings/commission-setting/commission-model';

export interface StaffBranchesDialogData {
  staffUid: string;
  staffName: string;
  period: string;
  year: number;
  month: number;
}

@Component({
  selector: 'app-staff-branches-dialog-component',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './staff-branches-dialog-component.html',
  styleUrl: './staff-branches-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffBranchesDialogComponent {

  branches: StaffBranch[] = [];
  loading = true;

  constructor(
    private dialogRef: MatDialogRef<StaffBranchesDialogComponent>,
    private commissionService: CommissionService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: StaffBranchesDialogData
  ) {
    this.load();
  }

  private load(): void {
    this.commissionService
      .findStaffBranches(this.data.staffUid, this.data.year, this.data.month)
      .subscribe({
        next: (res) => {
          this.branches = res?.data ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Staff branches error:', error);
          this.branches = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  get paidCount(): number {
    return this.branches.filter(b => b.paid).length;
  }

  get unpaidCount(): number {
    return this.branches.filter(b => !b.paid).length;
  }

  get totalCommission(): number {
    return this.branches.reduce((sum, b) => sum + (b.commission || 0), 0);
  }

  // The branch's own subscription state is what explains a blank month:
  // EXPIRED means it lapsed, PENDING means a payment was started but never
  // authorised on the phone, FREE means it is still on trial.
  statusKey(branch: StaffBranch): string {
    switch (branch.subscriptionStatus) {
      case 'ACTIVE':  return 'STAFF_BRANCHES_DIALOG.STATUS_ACTIVE';
      case 'FREE':    return 'STAFF_BRANCHES_DIALOG.STATUS_FREE';
      case 'PENDING': return 'STAFF_BRANCHES_DIALOG.STATUS_PENDING';
      case 'FAILED':  return 'STAFF_BRANCHES_DIALOG.STATUS_FAILED';
      case 'EXPIRED': return 'STAFF_BRANCHES_DIALOG.STATUS_EXPIRED';
      default:        return 'STAFF_BRANCHES_DIALOG.STATUS_UNKNOWN';
    }
  }

  statusClass(branch: StaffBranch): string {
    return (branch.subscriptionStatus || 'unknown').toLowerCase();
  }

  close(): void {
    this.dialogRef.close();
  }
}
