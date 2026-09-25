import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { MatDivider } from "@angular/material/divider";

export type MatMenuItem ={
  type?: 'item' | 'divider';
  label?: string;         
  icon?: string;
  disabled?: boolean;
  value?: any;
}

@Component({
  selector: 'app-mat-menu',
  standalone:true,
  imports: [MatButtonModule, MatMenuModule, MatIconModule, CommonModule, MatDivider],
  templateUrl: './mat-menu.html',
  styleUrl: './mat-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatMenuComponent {

  @Input() triggerIcon: string = 'more_vert';
  @Input() menuItems: MatMenuItem[] = [];
  @Output() itemSelected = new EventEmitter<MatMenuItem>();

  onSelect(item: MatMenuItem) {
    if (!item.disabled) {
      this.itemSelected.emit(item);
    }
  }
}
