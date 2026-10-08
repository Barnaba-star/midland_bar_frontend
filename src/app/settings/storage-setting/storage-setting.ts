import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { Service } from '../service';
import { CommonModule } from '@angular/common';
import { TableSizeDialogComponent } from '../../Utils/component/dialogs/table-size-dialog-component/table-size-dialog-component';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NodeService } from '../node-setting/node-service';
import { AlertService } from '../../Utils/services/alert';
import { localDate } from '../../Utils/services/local-date';
import { PurgeBranchDialogComponent } from '../../Utils/component/dialogs/purge-branch-dialog/purge-branch-dialog';

interface PeriodBranch { uid: string; branchName: string; branchCode: string; }
interface PeriodRow { table: string; count: number; }
export interface TableSize {
  schemaName: string;
  tableName: string;
  rowCount: number;
  tableSizeBytes: number;
  indexSizeBytes: number;
  totalSizeBytes: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
}
@Component({
  selector: 'app-storage-setting',
  imports: [Title2, CommonModule, TranslatePipe, FormsModule, MatIconModule],
  templateUrl: './storage-setting.html',
  styleUrl: './storage-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageSetting  implements OnInit{
  constructor(private visibility:Authentication, private service:Service, private cdr:ChangeDetectorRef, private dialog:MatDialog,
              private nodeService:NodeService, private alert:AlertService, private translate:TranslateService){}
  ngOnInit(): void {
   this.getTableSizes();
   if (this.isRoot) {
     this.resetPeriod();
     this.loadPeriodBranches();
   }
   this.storage ='STORAGE_SETTING_PAGE.MANAGE_TAB'
  }
  titleAction:string='STORAGE_SETTING_PAGE.TITLE'
  storage:string=''
  onAction(action: string) {
      this.storage = action;
      if(this.storage ==='STORAGE_SETTING_PAGE.MANAGE_TAB'){

      }
    }

 titleActions = [
     { icon: 'more', title: 'STORAGE_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER'] }
 ];

 getTitled(title:TitleAction[]):TitleAction[]{
 return this.visibility.filteredTitleActions(title);
 }

tableSizes: TableSize[] = [];

totalTables = 0;
totalSizeBytes = 0;
largestTable: TableSize | null = null;

getTableSizes() {
  this.service.getTableSizes().subscribe({
    next: (res) => {

      if (res.data) {

        this.tableSizes = res.data;
        this.cdr.detectChanges();
        this.totalTables = this.tableSizes.length;

        this.totalSizeBytes = this.tableSizes.reduce(
          (total, table) => total + table.totalSizeBytes,
          0
        );

        this.largestTable = this.tableSizes.length
          ? this.tableSizes.reduce((largest, current) =>
              current.totalSizeBytes > largest.totalSizeBytes
                ? current
                : largest
            )
          : null;

        console.log('Table Sizes:', this.tableSizes);

        // detectChanges() above runs before the totals are worked out, so the
        // view still has to be marked once everything is assigned.
        this.cdr.markForCheck();
      }
    },

    error: (error) => {
      console.error('Failed to load table sizes', error);
    }
  });
}

formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) {
    return '0 Bytes';
  }

  const units = [
    'Bytes',
    'KB',
    'MB',
    'GB',
    'TB'
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return (
    (bytes / Math.pow(1024, index)).toFixed(2)
    + ' '
    + units[index]
  );
}


openSizeDialog(table: any) {
  const dialogRef = this.dialog.open(TableSizeDialogComponent, {
    width: '500px',
    data: table
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      console.log('Delete request:', result);

    
    }
  });
}




/* ===================== CLEAR A BRANCH'S RECORDS FOR A PERIOD (ROOT) ===================== */

/** Only ROOT gets the card; the backend refuses everyone else as well. */
get isRoot(): boolean {
  return this.visibility.hasRole('ROOT');
}

/** Today on this device, yyyy-MM-dd - the last day the period may reach. */
readonly today = localDate(new Date());

periodBranches: PeriodBranch[] = [];
periodBranchUID = '';
periodFrom = '';
periodTo = '';
periodBusy = false;
/** What a dry run found (null = not counted yet for the current choice). */
periodPreview: PeriodRow[] | null = null;
/** What the real run removed, shown until the choice changes. */
periodDeleted: PeriodRow[] | null = null;
/** i18n key of the last problem, or ''. */
periodError = '';

/** Last month, first to last day: old enough to let go of, small enough to check. */
private resetPeriod(): void {
  const now = new Date();
  this.periodFrom = localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  this.periodTo = localDate(new Date(now.getFullYear(), now.getMonth(), 0));
}

loadPeriodBranches(): void {
  this.nodeService.findBranchList().subscribe({
    next: (res) => {
      this.periodBranches = (res.data ?? []).map((b: any) => ({
        uid: b.uid,
        branchName: b.branchName ?? b.name ?? '',
        branchCode: b.branchCode ?? '',
      }));
      this.cdr.markForCheck();
    },
    error: () => {
      this.periodBranches = [];
      this.cdr.markForCheck();
    },
  });
}

get periodBranch(): PeriodBranch | undefined {
  return this.periodBranches.find((b) => b.uid === this.periodBranchUID);
}

/** yyyy-MM-dd strings compare correctly as text. */
get periodDatesValid(): boolean {
  return !!this.periodFrom && !!this.periodTo
    && this.periodFrom <= this.periodTo && this.periodTo <= this.today;
}

get periodValid(): boolean {
  return !!this.periodBranch && this.periodDatesValid;
}

/** Any change of branch or dates makes earlier counts meaningless. */
onPeriodChange(): void {
  this.periodPreview = null;
  this.periodDeleted = null;
  this.periodError = '';
  this.cdr.markForCheck();
}

periodTotal(rows: PeriodRow[] | null): number {
  return (rows ?? []).reduce((sum, r) => sum + r.count, 0);
}

private toRows(data: Record<string, number>): PeriodRow[] {
  return Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([table, count]) => ({ table, count }));
}

private periodCodeKey(code?: string | null): string {
  const known = ['ROOT_ONLY', 'BRANCH_NOT_FOUND', 'BAD_PERIOD', 'CONFIRM_CODE', 'BLOCKED'];
  return 'PURGE_PERIOD.ERR_' + (code && known.includes(code) ? code : 'FAILED');
}

previewPeriod(): void {
  const branch = this.periodBranch;
  if (!branch || !this.periodDatesValid || this.periodBusy) return;
  this.periodBusy = true;
  this.periodError = '';
  this.periodDeleted = null;
  this.cdr.markForCheck();
  this.nodeService.purgeBranchPeriod(branch.uid, { from: this.periodFrom, to: this.periodTo, dryRun: true }).subscribe({
    next: (res) => {
      this.periodBusy = false;
      if (res.data) {
        this.periodPreview = this.toRows(res.data);
      } else {
        this.periodPreview = null;
        this.periodError = this.periodCodeKey(res.message);
      }
      this.cdr.markForCheck();
    },
    error: (err) => {
      this.periodBusy = false;
      this.periodPreview = null;
      this.periodError = this.periodCodeKey(err?.error?.message);
      this.cdr.markForCheck();
    },
  });
}

confirmPeriodPurge(): void {
  const branch = this.periodBranch;
  if (!branch || !this.periodDatesValid || !this.periodPreview?.length) return;
  const from = this.periodFrom;
  const to = this.periodTo;
  const ref = this.dialog.open(PurgeBranchDialogComponent, {
    width: '460px',
    maxWidth: '95vw',
    autoFocus: false,
    data: { branchName: branch.branchName, branchCode: branch.branchCode, textKey: 'PURGE_PERIOD', from, to },
  });
  ref.afterClosed().subscribe((code?: string) => {
    if (!code) return;
    this.periodBusy = true;
    this.cdr.markForCheck();
    this.nodeService.purgeBranchPeriod(branch.uid, { from, to, confirmCode: code, dryRun: false }).subscribe({
      next: (res) => {
        this.periodBusy = false;
        if (res.data) {
          this.periodDeleted = this.toRows(res.data);
          this.periodPreview = null;
          this.alert.show('success', this.translate.instant('PURGE_PERIOD.DONE', { count: this.periodTotal(this.periodDeleted) }));
          this.getTableSizes();
        } else {
          this.periodError = this.periodCodeKey(res.message);
          this.alert.show('error', this.translate.instant(this.periodError));
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.periodBusy = false;
        this.periodError = this.periodCodeKey(err?.error?.message);
        this.alert.show('error', this.translate.instant(this.periodError));
        this.cdr.markForCheck();
      },
    });
  });
}

}
