import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActionMenuComponent } from "../action-menu-component/action-menu-component";
import { MatMenuModule } from "@angular/material/menu";
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-recordtable',
  templateUrl: './recordtable.html',
  styleUrls: ['./recordtable.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule,  MatMenuModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordtableComponent {
@Input() columns: {
  field: string;
  header: string;

  // Icon
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconColor?: string;

  // Cell colors by value
  cellColors?: {
    [value: string]: {
      background: string;
      color: string;
    };
  };
}[] = [];

@Input() serialNumber = {
  enabled: true,
  background: '#0d6efd',
  color: '#fff',
  size: '32px',
  border: '',
  fontWeight: '600'
};

  @Input() data: any[] = [];
  @Input() showView: boolean = false;
  @Input() showEdit: boolean = false;
  @Input() showDelete: boolean = false;
  @Input() showDoc: boolean = false;
  @Output() viewRecord = new EventEmitter<any>();
  @Output() editRecord = new EventEmitter<any>();
  @Output() deleteRecord = new EventEmitter<any>();
  @Output() openDoc = new EventEmitter<any>();
  @Input() menuList: { icon: string; label: string; action: string }[] = [];
 @Output() actionClick = new EventEmitter<{ action: string, row: any }>();

onView(row: any) {
    this.viewRecord.emit(row);
}
onEdit(row: any) {
this.editRecord.emit(row);
}
onDelete(row: any) {
this.deleteRecord.emit(row);
}

onOpenDoc(row: any){
this.openDoc.emit(row);
}

openMenuRow: any = null;
openMenuRowIndex: number | null = null;

toggleMenu(rowIndex: number) {
  this.openMenuRowIndex = this.openMenuRowIndex === rowIndex ? null : rowIndex;
}
handleMenuClick(action: string, row: any) {
    this.actionClick.emit({ action, row });
    this.openMenuRow = null;
  }

}
