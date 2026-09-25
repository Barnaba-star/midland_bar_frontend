import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class IconRegistryService {
  private icons: { name: string; path: string }[] = [
    { name: 'social', path: 'assets/icons/social.svg' },
    { name: 'support', path: 'assets/icons/support.svg' },
    { name: 'events', path: 'assets/icons/events.svg' },
    { name: 'invite', path: 'assets/icons/invite.svg' },
    { name: 'username', path: 'assets/icons/username.svg' },
    { name: 'password', path: 'assets/icons/password.svg' },
    { name: 'fingerprint', path: 'assets/icons/fingerprint.svg' },
    { name: 'registration', path: 'assets/icons/registration.svg' },
    { name: 'announce', path: 'assets/icons/announce.svg' },
    { name: 'register', path: 'assets/icons/register.svg' },
    { name: 'bar', path: 'assets/icons/bar.svg' },
    { name: 'payment', path: 'assets/icons/payment.svg' },
    { name: 'pay', path: 'assets/icons/pay.svg' },
    { name: 'personnel', path: 'assets/icons/personnel.svg' },
    { name: 'setting', path: 'assets/icons/setting.svg' },
    { name: 'fullscreen', path: 'assets/icons/fullscreen.svg' },
    { name: 'notification', path: 'assets/icons/notification.svg' },
    { name: 'filter', path: 'assets/icons/filter.svg' },
    { name: 'brightness', path: 'assets/icons/brightness.svg' },
    { name: 'login', path: 'assets/icons/login.svg' },
    { name: 'back', path: 'assets/icons/back.svg' },
    { name: 'arrowback', path: 'assets/icons/arrowback.svg' },
    { name: 'team', path: 'assets/icons/team.svg' },
    { name: 'member', path: 'assets/icons/member.svg' },
    { name: 'summary', path: 'assets/icons/summary.svg' },
    { name: 'action', path: 'assets/icons/action.svg' },
    { name: 'guidelines', path: 'assets/icons/guidelines.svg' },
    { name: 'data', path: 'assets/icons/data.svg' },
    { name: 'add', path: 'assets/icons/add.svg' },
    { name: 'close', path: 'assets/icons/close.svg' },
    { name: 'person', path: 'assets/icons/person.svg' },
    { name: 'edit', path: 'assets/icons/edit.svg' },
    { name: 'delete', path: 'assets/icons/delete.svg' },
    { name: 'attachment', path: 'assets/icons/attachment.svg' },
    { name: 'arrow', path: 'assets/icons/arrow.svg' },
    { name: 'more', path: 'assets/icons/more.svg' },
    { name: 'question', path: 'assets/icons/question.svg' },
    { name: 'open', path: 'assets/icons/open.svg' },
    { name: 'logout', path: 'assets/icons/logout.svg' },
    { name: 'seting', path: 'assets/icons/seting.svg' },
    { name: 'role', path: 'assets/icons/role.svg' },
    { name: 'permission', path: 'assets/icons/permission.svg' },
    { name: 'workflow', path: 'assets/icons/workflow.svg' },
    { name: 'user', path: 'assets/icons/user.svg' },
    { name: 'account', path: 'assets/icons/account.svg' },
    { name: 'load', path: 'assets/icons/load.svg' },
    { name: 'levels', path: 'assets/icons/levels.svg' },
    { name: 'save', path: 'assets/icons/save.svg' },
    { name: 'process', path: 'assets/icons/process.svg' },
    { name: 'forward', path: 'assets/icons/forward.svg' },
    { name: 'rollback', path: 'assets/icons/rollback.svg' },
    { name: 'history', path: 'assets/icons/history.svg' },
    { name: 'changepassword', path: 'assets/icons/changepassword.svg' },
    { name: 'profile', path: 'assets/icons/profile.svg' },
    { name: 'position', path: 'assets/icons/position.svg' },
    { name: 'warning', path: 'assets/icons/warning.svg' },
    { name: 'arrowdown', path: 'assets/icons/arrowdown.svg' },
    { name: 'actioncompletion', path: 'assets/icons/actioncompletion.svg' },
    { name: 'success', path: 'assets/icons/success.svg' },
    { name: 'roomseting', path: 'assets/icons/roomseting.svg' },
    { name: 'bar', path: 'assets/icons/bar.svg' },
    { name: 'food', path: 'assets/icons/food.svg' },
    { name: 'room', path: 'assets/icons/room.svg' },
    { name: 'bed', path: 'assets/icons/bed.svg' },
    { name: 'home', path: 'assets/icons/home.svg' },
    { name: 'report', path: 'assets/icons/report.svg' },
    { name: 'service', path: 'assets/icons/service.svg' },
    { name: 'calender', path: 'assets/icons/calender.svg' },
    { name: 'payment2', path: 'assets/icons/payment2.svg' },
    { name: 'commission', path: 'assets/icons/commission.svg' },
    { name: 'stock', path: 'assets/icons/stock.svg' },
    { name: 'person2', path: 'assets/icons/person2.svg' },
    { name: 'person', path: 'assets/icons/person.svg' },
    { name: 'office', path: 'assets/icons/office.svg' },
    { name: 'fullscreen', path: 'assets/icons/fullscreen.svg' },
    { name: 'expand', path: 'assets/icons/expand.svg' },
    { name: 'hide', path: 'assets/icons/hide.svg' },
    { name: 'store', path: 'assets/icons/store.svg' },
    { name: 'back', path: 'assets/icons/back.svg' },
    { name: 'next', path: 'assets/icons/next.svg' },
     { name: 'right', path: 'assets/icons/right.svg' },
      { name: 'error', path: 'assets/icons/error.svg' },
  ];

  constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
    this.registerIcons();
  }

  private registerIcons() {
    this.icons.forEach(icon => {
      this.matIconRegistry.addSvgIcon(
        icon.name,
        this.domSanitizer.bypassSecurityTrustResourceUrl(icon.path)
      );
    });
  }
}
