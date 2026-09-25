import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'action-menu',
  imports:[CommonModule],
  standalone: true,
  templateUrl: './action-menu-component.html',
  styleUrls: ['./action-menu-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionMenuComponent {

  @Input() row: any;
  @Input() menuItems: { icon: string; label: string; action: string }[] = [];
  @Output() menuClick = new EventEmitter<{ action: string; row: any }>();

  onItemClick(item: any) {
    this.menuClick.emit({ action: item.action, row: this.row });
  }
}
