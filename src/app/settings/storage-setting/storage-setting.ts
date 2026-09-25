import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { Service } from '../service';
import { CommonModule } from '@angular/common';
import { TableSizeDialogComponent } from '../../Utils/component/dialogs/table-size-dialog-component/table-size-dialog-component';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
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
  imports: [Title2, CommonModule, TranslatePipe],
  templateUrl: './storage-setting.html',
  styleUrl: './storage-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageSetting  implements OnInit{
  constructor(private visibility:Authentication, private service:Service, private cdr:ChangeDetectorRef, private dialog:MatDialog){}
  ngOnInit(): void {
   this.getTableSizes();
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



}
