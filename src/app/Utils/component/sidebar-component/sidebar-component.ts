import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from "@angular/material/icon";


interface MenuItem {
  label: string;
  icon?: string;
  route?: string;       // optional, kwa routing
  action?: string;      // optional, kwa action kama hakuna route
  children?: MenuItem[]; // optional, submenu items
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar-component.html',
  styleUrls: ['./sidebar-component.css'],
  imports: [MatIconModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Input() menuItems: MenuItem[] = [];   // projectable menu items
  openSubmenus: { [key: number]: boolean } = {};  // track open/close state

  toggleSubmenu(index: number) {
    this.openSubmenus[index] = !this.openSubmenus[index];
  }

  onItemClick(item: MenuItem) {
    if(item.action){
      console.log('Menu action triggered:', item.action);
      // Hapa unaweza emit action kwa parent component kama unataka
    }
  }
}
