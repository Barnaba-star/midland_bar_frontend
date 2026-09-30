import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd  } from '@angular/router';
import { SidenavItem } from '../Utils/component/main-sidenav-component/model';
import { MainSidenavComponent } from "../Utils/component/main-sidenav-component/main-sidenav-component";
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Authentication } from '../Utils/services/authentication';
import { MainSidenav2 } from "../Utils/component/main-sidenav2/main-sidenav2";
import { TranslatePipe } from '@ngx-translate/core';
import { SETTINGS_MANAGE_ROLES, SETTINGS_ROLES, SETTINGS_ROOT_ONLY_ROLES, settingsLandingRoute } from './settings-role.guard';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet,  CommonModule, MainSidenav2, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit{
constructor(private router: Router, private route: ActivatedRoute, private visibility:Authentication,
  private cdr: ChangeDetectorRef) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkIfHome();
        this.cdr.markForCheck();
      });
}
  ngOnInit(): void {
    // STAFF can't open Role, so land everyone on their own first section.
    this.router.navigate([
        settingsLandingRoute(this.visibility)
      ]);
  }

isHome = true;
// ROOT sees every section; DIRECTOR sees Role, Branch and Users; STAFF
// only sees Branch.
private readonly settingsRoles = SETTINGS_ROLES;
private readonly manageRoles = SETTINGS_MANAGE_ROLES;
private readonly rootOnlyRoles = SETTINGS_ROOT_ONLY_ROLES;
menuItems: SidenavItem[] = [
      {
        label: 'SETTINGS_MENU.ROLE',
        icon: 'role',
        route: '/settings/role',
        roles: this.manageRoles
      },
      {
        label: 'SETTINGS_MENU.BRANCH',
        icon: 'office',
        route: '/settings/node',
        roles: this.settingsRoles
      },
      {
        label: 'SETTINGS_MENU.USERS',
        icon: 'user',
        route: '/settings/users',
        roles: this.manageRoles
      },
      {
        label: 'SETTINGS_MENU.COMMISSION',
        icon: 'commission',
        route: '/settings/commission',
        // STAFF see it too, but the backend narrows it to their own earnings
        roles: this.settingsRoles
      },
      {
        label: 'SETTINGS_MENU.PERMISSIONS',
        icon: 'permission',
        route: '/settings/permissions',
        roles: this.rootOnlyRoles
      },


   {
        label: 'SETTINGS_MENU.CONFIG',
        icon: 'setting',
        route: '/settings/configuration',
        roles: this.rootOnlyRoles
      },
       {
        label: 'SETTINGS_MENU.STORAGE',
        icon: 'save',
        route: '/settings/storage',
        roles: this.rootOnlyRoles
      }
];

getItems(menu: SidenavItem[]){
return this.visibility.filteredMenuItems(menu);
}



 goToNode() {
    this.router.navigate(['node']);
}

  private checkIfHome() {
    this.isHome = this.route.firstChild === null;
  }

}
