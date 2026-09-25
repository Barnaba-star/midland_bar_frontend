import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';
import { IconRegistryService } from '../../services/icon-registry.service';

export interface MenuItem {
  label: string;
  icon?: string;
  route?: string;
  action?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [RouterModule, MatListModule, MatIconModule, MatToolbarModule, MatSidenavModule, CommonModule],
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavComponent {
  imagePath: string = '';

  @Input() menuItems: MenuItem[] = [];
  @Output() menuItemClicked = new EventEmitter<MenuItem>();

  // track which menu indexes are open
  openSubmenus: { [key: number]: boolean } = {};

  constructor(private router: Router, private iconRegistry: IconRegistryService) {}

  onItemClick(item: MenuItem, index?: number) {
    if (item.children && index !== undefined) {
      // toggle submenu
      this.openSubmenus[index] = !this.openSubmenus[index];
      return; // don't navigate if it has children
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }

    if (item.action) {
      this.menuItemClicked.emit(item);
    }
  }

  goDashboard() {
    this.router.navigate(['/dashboard']);
  }

  isSubmenuOpen(index: number): boolean {
    return !!this.openSubmenus[index];
  }
}
