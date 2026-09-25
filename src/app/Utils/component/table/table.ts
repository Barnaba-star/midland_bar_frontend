import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ViewChild, TemplateRef, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface TableColumn {
  field: string;
  header?: string;

  icon?: string;
  iconPosition?: 'left' | 'right';
  iconColor?: string;

  cellColors?: {
    [value: string]: {
      background: string;
      color: string;
    };
  };
}

@Component({
    selector: 'app-table',
    imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, MatInputModule, MatCheckboxModule],
    templateUrl: './table.html',
    styleUrls: ['./table.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent implements OnInit, AfterViewInit {
 @Input() columns: TableColumn[] = [];

  @Input() dataSource: MatTableDataSource<any> = new MatTableDataSource();
  @Input() customActionTemplate?: TemplateRef<any>;
  @Input() columnHeaderMap: { [key: string]: string } = {};
  /****ACTION VISIBILITY********** */
  @Input() showEdit = true;
  @Input() showDelete = true;
  @Input() showMore = false;
  @Input() showCheckbox = false;
  @Input() showToggle = false;

  // Event Emitters
  @Output() editEvent = new EventEmitter<any>();
  @Output() deleteEvent = new EventEmitter<any>();
  @Output() moreEvent = new EventEmitter<any>();
  @Output() checkboxChanged = new EventEmitter<{ row: any, checked: boolean }>();
  @Output() toggleChanged = new EventEmitter<{ row: any, value: boolean }>();
  @Output() search = new EventEmitter<string>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {}
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

 ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource'] && this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.search.emit(filterValue);
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) ?? 'N/A';
  }
 onEdit(row: any) {
    this.editEvent.emit(row);
  }

  onDelete(row: any) {
    this.deleteEvent.emit(row);
  }

  onMore(row: any) {
    this.moreEvent.emit(row);
  }

  onCheckboxChange(row: any, event: any) {
    this.checkboxChanged.emit({ row, checked: event.checked });
  }

  onToggleChange(row: any, event: any) {
    this.toggleChanged.emit({ row, value: event.checked });
  }
get completeColumns(): string[] {
  return [
    'sn',
    ...this.columns.map(col => col.field),
    'actions'
  ];
}



trackByUid(index: number, item: any): any {
  return item?.uid || index;
}
@Input() serialNumber = {
  background: '#198754',
  color: '#fff',
  size: '34px'
};


}
