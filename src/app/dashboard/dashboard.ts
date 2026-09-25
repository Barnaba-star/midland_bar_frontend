import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IconRegistryService } from '../Utils/services/icon-registry.service';
import { Router, RouterModule } from '@angular/router';
import { MatDivider } from "@angular/material/divider";
import { TitleComponent } from "../Utils/component/title/title.component";
import { Authentication } from '../Utils/services/authentication';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, RouterModule, TranslatePipe],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
constructor(private iconRegistry: IconRegistryService, private route:Router, private visibility:Authentication){}

get fullName(): string {
  return this.visibility.getFullName() || this.visibility.getUsername();
}

logout() {
  this.visibility.stopHeartbeat();
  this.visibility.removeToken();
  this.route.navigate(['login']);
}

cards = [
   {
    title: 'DASHBOARD.CARD_POS_TITLE',
    icon: 'bar',
    img: 'assets/icons/bar.png',
    description: 'DASHBOARD.CARD_POS_DESC',
    // Open POS on its own home - the branch dashboard - rather than dropping
    // straight into one section of it.
    route: '/pos',
    roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER']
  },
  {
    title: 'DASHBOARD.CARD_SETTING_TITLE',
    icon: 'register',
    img: 'assets/icons/personnel.svg',
    description: 'DASHBOARD.CARD_SETTING_DESC',
    route: '/settings',
    roles: ['ROOT', 'STAFF', 'DIRECTOR', 'REG OFFICER']
  },
  {
    // What branches are asking, and what we publish back to them. STAFF is
    // out: they register branches, they do not answer for the platform.
    title: 'DASHBOARD.CARD_ADMIN_TITLE',
    icon: 'announce',
    img: 'assets/icons/announce.svg',
    description: 'DASHBOARD.CARD_ADMIN_DESC',
    route: '/admin',
    roles: ['ROOT', 'DIRECTOR']
  },

];

goTo(route: string) {
  this.route.navigate([route]);
}

get filteredCards() {
  return this.cards.filter(card =>
    card.roles.some(role => this.visibility.hasRole(role))
  );
}

}
