import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidenavItem } from '../Utils/component/main-sidenav-component/model';
import { MainSidenav2 } from '../Utils/component/main-sidenav2/main-sidenav2';
import { Authentication } from '../Utils/services/authentication';
import { ADMIN_MANAGE_ROLES, ADMIN_ROLES, ADMIN_ROOT_ONLY_ROLES, adminLandingRoute } from './admin-role.guard';

/**
 * The third area, beside POS and Settings.
 *
 * Settings is how the system is configured - roles, branches, regions,
 * percentages. This is the running of it: what branches are telling us, and
 * what we are telling them back. Putting the two together would have made a
 * fifteen-item Settings menu out of two jobs that are not configuration.
 */
@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, CommonModule, MainSidenav2],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visibility: Authentication,
    private cdr: ChangeDetectorRef,
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isHome = this.route.firstChild === null;
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    this.router.navigate([adminLandingRoute]);
  }

  isHome = true;

  private readonly adminRoles = ADMIN_ROLES;
  private readonly rootOnlyRoles = ADMIN_ROOT_ONLY_ROLES;
  private readonly manageRoles = ADMIN_MANAGE_ROLES;

  menuItems: SidenavItem[] = [
    {
      label: 'ADMIN_MENU.MESSAGES',
      icon: 'announce',
      route: '/admin/messages',
      roles: this.adminRoles
    },
    {
      label: 'ADMIN_MENU.GUIDANCE',
      icon: 'guidelines',
      route: '/admin/guidance',
      roles: this.adminRoles
    },
    {
      label: 'SETTINGS_MENU.ERRORS',
      icon: 'warning',
      route: '/admin/errors',
      roles: this.adminRoles
    },
    {
      label: 'SETTINGS_MENU.AUDIT',
      icon: 'history',
      route: '/admin/audit',
      roles: this.adminRoles
    },
    {
      label: 'SETTINGS_MENU.EXPIRING',
      icon: 'calender',
      route: '/admin/expiring',
      roles: this.adminRoles
    },
    {
      label: 'SETTINGS_MENU.PAYMENTS',
      icon: 'payment',
      route: '/admin/payments',
      roles: this.manageRoles
    },
    {
      label: 'SETTINGS_MENU.PAYROLL',
      icon: 'pay',
      route: '/admin/payroll',
      roles: this.manageRoles
    },
    {
      label: 'SETTINGS_MENU.REGIONS',
      icon: 'office',
      route: '/admin/regions',
      roles: this.rootOnlyRoles
    }
  ];

  getItems(menu: SidenavItem[]) {
    return this.visibility.filteredMenuItems(menu);
  }
}
