import { ConnectivityBadge } from '../../offline/connectivity-badge';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import { AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';

import { interval, map, Observable, Subscription } from 'rxjs';

import { UserService } from '../../../settings/users-setting/user-service';
import { UploadedImageService } from '../../services/uploaded-image';
import { Authentication } from '../../services/authentication';
import { IconRegistryService } from '../../services/icon-registry.service';
import { NotificationService, AppNotification } from '../../services/notification-service';
import { GlobalSearchService, SearchItem } from '../../services/global-search';
import { HelpDialogComponent } from '../dialogs/help-dialog-component/help-dialog-component';
import { ProfileDialogComponent } from '../dialogs/profile-dialog-component/profile-dialog-component';
import { ChangePasswordDialogComponent } from '../dialogs/change-password-dialog-component/change-password-dialog-component';
import { SubscribeDialogComponent } from '../dialogs/subscribe-dialog-component/subscribe-dialog-component';
import { SystemSettingService } from '../../services/system-setting';
import { AlertService } from '../../services/alert';

import { SidenavItem } from '../main-sidenav-component/model';
import { POS_FULL_ACCESS_ROLES, isCashierOnly } from '../../../pos/pos-role.guard';


@Component({
  selector: 'app-main-sidenav2',
  standalone: true,

  imports: [ConnectivityBadge, 
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    TranslatePipe,
    AsyncPipe,
    DatePipe,
    FormsModule,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './main-sidenav2.html',
  styleUrl: './main-sidenav2.css',
})
export class MainSidenav2 implements OnInit, OnDestroy {

  // ============================================================
  // USER INFORMATION
  // ============================================================

  username = '';
  role = '';
  tenantID = '';
  personnelUID = '';
  userProfilePath = '';
  userUID = '';

  profilePic = '';

  branchUID = '';
  branchName = '';
  branchCategory = '';
  subscriptionStatus = '';
  subscriptionEndDate: string | null = null;

  // Monthly price for this branch. Kept so the subscribe dialog can check the
  // total against the provider's minimum BEFORE sending - below it, Snippe
  // answers with its own raw English text, which used to reach the customer.
  subscriptionAmount: number | null = null;
  private subscriptionPollSub?: Subscription;
  private subscriptionPollPeriod = 0;

  fullName = '';
  email = '';

  selectedLanguage = 'sw';


  // ============================================================
  // SIDEBAR / MENU STATE
  // ============================================================

  isOpen = true;

  isMobileView = false;

  private static readonly MOBILE_BREAKPOINT = 767;

  openIndex: number | null = null;

  openMenu1 = false;
  openMenu2 = false;

  profile = false;

  isLanguage = true;

  isFullscreen = false;

  isOpenRightNav = false;

  isDarkMode = false;


  // ============================================================
  // INPUTS
  // ============================================================

  @Input() menuItems: SidenavItem[] = [];

  @Input() logoUrl = 'assets/images/baronix-logo.png';

  canManageLogo = false;

  // CASHIER only works the till: the header leaves out Notifications,
  // Settings, Help and Subscribe for them.
  isCashier = false;

  // Notifications and the Settings shortcut are for CEO and above: hidden
  // from CASHIER and from a MANAGER who holds no higher role.
  hideAdminIcons = false;

  /** STAFF in a customer's branch: view only (the token allows nothing else). */
  viewOnly = false;


  // ============================================================
  // OTHER
  // ============================================================

  currentYear = new Date().getFullYear();


  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  notificationsOpen = false;

  notifications$!: Observable<AppNotification[]>;
  unreadCount$!: Observable<number>;


  // ============================================================
  // SEARCH
  // ============================================================

  searchOpen = false;
  searchQuery = '';
  searchResults: SearchItem[] = [];
  activeResultIndex = 0;

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;


  constructor(
    private router: Router,
    private authDetails: Authentication,
    private iconRegistry: IconRegistryService,
    private userService: UserService,
    private auth: Authentication,
    private translate: TranslateService,
    private notificationService: NotificationService,
    private globalSearch: GlobalSearchService,
    private dialog: MatDialog,
    private systemSettingService: SystemSettingService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private uploadedImage: UploadedImageService,
  ) {

    this.notifications$ = this.notificationService.notifications$;

    this.unreadCount$ = this.notifications$.pipe(
      map(list => list.filter(n => !n.read).length)
    );
  }


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.username = this.authDetails.getFullName();

    this.fullName = this.authDetails.getFullName();

    this.email = this.authDetails.getEmail();

    this.role = this.authDetails.getRoles();

    this.tenantID = this.authDetails.getTenantId();

    this.userUID = this.authDetails.getUserUID();

    this.branchUID = this.authDetails.getBranchUID();


    console.log('Username in Sidenav:', this.username);
    console.log('Role in Sidenav:', this.role);
    console.log('Tenant ID in Sidenav:', this.tenantID);
    console.log('BranchUID:', this.branchUID);


    // Load user profile
    if (this.userUID) {
      this.findUserProfilePic(this.userUID);
    }


    // Load branch
    if (this.branchUID) {
      this.findBranchByUID(this.branchUID);
    }


    // Company logo
    this.canManageLogo = this.authDetails.hasRole('ROOT')
      || (this.authDetails.getPermissions() || '').split(',').includes('MANAGE_SYSTEM_SETTINGS');
    this.loadSystemLogo();

    this.isCashier = isCashierOnly(this.authDetails);
    const isManagerOnly = this.authDetails.hasRole('MANAGER')
      && !POS_FULL_ACCESS_ROLES.some(role => this.authDetails.hasRole(role));
    this.hideAdminIcons = this.isCashier || isManagerOnly;
    this.viewOnly = this.authDetails.isViewOnly();


    // Language
    const lang = localStorage.getItem('language') || 'sw';

    this.selectedLanguage = lang;

    this.translate.use(lang);


    // Theme
    this.isDarkMode = localStorage.getItem('theme') === 'dark';

    this.applyTheme();


    // Mobile: start with the drawer closed so it doesn't cover the page
    this.updateMobileView();

    if (this.isMobileView) {
      this.isOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptionPollSub?.unsubscribe();
  }


  // ============================================================
  // RESPONSIVE
  // ============================================================

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateMobileView();
  }

  private updateMobileView(): void {

    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= MainSidenav2.MOBILE_BREAKPOINT;
  }

  closeSidenav(): void {
    this.isOpen = false;
  }

  private closeSidenavIfMobile(): void {

    if (this.isMobileView) {
      this.isOpen = false;
    }
  }


  // ============================================================
  // THEME
  // ============================================================

  toggleTheme(): void {

    this.isDarkMode = !this.isDarkMode;

    localStorage.setItem(
      'theme',
      this.isDarkMode ? 'dark' : 'light'
    );

    this.applyTheme();
  }


  private applyTheme(): void {

    document.documentElement.setAttribute(
      'data-theme',
      this.isDarkMode ? 'dark' : 'light'
    );
  }


  // ============================================================
  // LANGUAGE
  // ============================================================

  toggleLanguage(): void {

    this.selectedLanguage =
      this.selectedLanguage === 'en'
        ? 'sw'
        : 'en';

    this.translate.use(this.selectedLanguage);

    localStorage.setItem(
      'language',
      this.selectedLanguage
    );
  }


  // ============================================================
  // USER PROFILE
  // ============================================================

  findUserProfilePic(userUID: string): void {

    this.userService.findUserProfilePic(userUID).subscribe({

      next: (res) => {

        if (res.data?.imageName) {

          this.uploadedImage.load(res.data.imageName).subscribe((url) => {
            this.profilePic = url ?? this.profilePic;
            this.cdr.markForCheck();
          });
        }

      },

      error: (error) => {

        console.error(
          'Error occurred during fetching image',
          error
        );

      }

    });
  }


  // ============================================================
  // BRANCH
  // ============================================================

  findBranchByUID(branchUID: string): void {

    this.userService.findBranchByUID(branchUID).subscribe({

      next: (res) => {

        console.log(
          'Branch Found:',
          res.data
        );

        this.branchName =
          res.data.branchName;

        this.branchCategory =
          res.data.branchCategory;

        const previousStatus = this.subscriptionStatus;

        this.subscriptionStatus =
          res.data.subscriptionStatus || '';

        // Only a change seen while watching a payment is news - on first load
        // the previous status is empty and nothing has just happened.
        if (previousStatus === 'PENDING' && this.subscriptionStatus === 'ACTIVE') {
          this.alertService.show('success', this.translate.instant('MENU.SUBSCRIPTION_CONFIRMED'));
        } else if (previousStatus === 'PENDING' && this.subscriptionStatus === 'FAILED') {
          this.alertService.show('error', this.translate.instant('MENU.SUBSCRIPTION_FAILED'));
        }

        this.subscriptionEndDate =
          res.data.closeSubscription || null;

        this.subscriptionAmount =
          res.data.subscriptionAmount ?? null;

        this.cdr.markForCheck();

        this.startSubscriptionStatusPolling();

      },

      error: (error) => {

        console.error(
          'Error occurred during fetching branch',
          error
        );

      }

    });
  }

  get subscriptionBadgeClass(): string {
    switch (this.subscriptionStatus) {
      case 'ACTIVE': return 'sub-badge active';
      case 'FREE': return 'sub-badge free';
      case 'PENDING': return 'sub-badge pending';
      case 'FAILED': return 'sub-badge failed';
      case 'EXPIRED': return 'sub-badge failed';
      default: return 'sub-badge unknown';
    }
  }

  get subscriptionDotClass(): string {
    switch (this.subscriptionStatus) {
      case 'ACTIVE': return 'sub-dot active';
      case 'FREE': return 'sub-dot free';
      case 'PENDING': return 'sub-dot pending';
      case 'FAILED': return 'sub-dot failed';
      case 'EXPIRED': return 'sub-dot failed';
      default: return 'sub-dot unknown';
    }
  }

  get subscriptionBadgeLabel(): string {
    switch (this.subscriptionStatus) {
      case 'ACTIVE': return 'MENU.SUBSCRIPTION_ACTIVE';
      case 'FREE': return 'MENU.SUBSCRIPTION_FREE';
      case 'PENDING': return 'MENU.SUBSCRIPTION_PENDING';
      case 'FAILED': return 'MENU.SUBSCRIPTION_FAILED';
      case 'EXPIRED': return 'MENU.SUBSCRIPTION_EXPIRED';
      default: return 'MENU.SUBSCRIPTION_UNKNOWN';
    }
  }

  // Snippe confirms payment via webhook on their own server, not to the
  // browser, so the only way this badge finds out the branch got paid (or
  // that an ACTIVE/FREE period quietly lapsed while someone was mid-session)
  // is by asking our backend again periodically. Runs for as long as the
  // sidenav is alive - cleaned up in ngOnDestroy. While a payment is
  // PENDING the customer is standing there with the phone in hand, so it
  // asks every few seconds and the badge flips as soon as the backend knows;
  // otherwise once a minute is plenty.
  private startSubscriptionStatusPolling(): void {

    if (!this.branchUID) {
      return;
    }

    const period = this.subscriptionStatus === 'PENDING' ? 5000 : 60000;
    if (this.subscriptionPollSub && this.subscriptionPollPeriod === period) {
      return;
    }

    this.subscriptionPollSub?.unsubscribe();
    this.subscriptionPollPeriod = period;
    this.subscriptionPollSub = interval(period)
      .subscribe(() => this.findBranchByUID(this.branchUID));
  }


  // ============================================================
  // COMPANY LOGO
  // ============================================================

  private loadSystemLogo(): void {

    this.systemSettingService.getLogo().subscribe({

      next: (res) => {

        if (res.data?.logoImage) {
          this.uploadedImage.load(res.data.logoImage).subscribe((url) => {
            this.logoUrl = url ?? this.logoUrl;
            this.cdr.markForCheck();
          });
        }
      },

      error: (error) => {
        console.error('Error loading system logo:', error);
      },
    });
  }

  onLogoSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.systemSettingService.uploadLogo(formData).subscribe({

      next: (res) => {

        input.value = '';

        if (res.data?.logoImage) {
          this.uploadedImage.load(res.data.logoImage).subscribe((url) => {
            this.logoUrl = url ?? this.logoUrl;
            this.cdr.markForCheck();
          });
        }

        this.cdr.markForCheck();
      },

      error: (error) => {

        input.value = '';

        console.error('Error uploading system logo:', error);

        this.cdr.markForCheck();
      },
    });
  }


  // ============================================================
  // PROFILE
  // ============================================================

  toggleProfile(): void {
    this.profile = !this.profile;

    if (this.profile) {
      this.notificationsOpen = false;
      this.searchOpen = false;
    }
  }


  // ============================================================
  // SIDEBAR
  // ============================================================

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
  }


  toggleSidenav(): void {
    this.isOpen = !this.isOpen;
  }


  // ============================================================
  // OLD MENU METHODS
  // ============================================================

  toggleMenu1(): void {
    this.openMenu1 = !this.openMenu1;
  }


  toggleMenu2(): void {
    this.openMenu2 = !this.openMenu2;
  }


  // ============================================================
  // MENU
  // ============================================================

  toggleMenu(index: number): void {

    this.openIndex =
      this.openIndex === index
        ? null
        : index;
  }


  onItemClick(
    item: SidenavItem,
    index: number
  ): void {

    // Parent menu
    if (item.children?.length) {

      this.toggleMenu(index);

      return;
    }


    // Route
    if (item.route) {

      this.router.navigate([
        item.route
      ]);

      this.closeSidenavIfMobile();

    }


    // Custom action
    if (item.action) {

      item.action();

    }
  }


  onSubItemClick(
    sub: SidenavItem
  ): void {

    this.openIndex = null;


    if (sub.route) {

      this.router.navigate([
        sub.route
      ]);

      this.closeSidenavIfMobile();

    }


    if (sub.action) {

      sub.action();

    }
  }


  // ============================================================
  // DASHBOARD
  // ============================================================

  goToDashboard(): void {

    this.router.navigate([
      'dashboard'
    ]);
  }


  // ============================================================
  // LOGIN / LOGOUT
  // ============================================================

  goToLogin(): void {

    this.router.navigate([
      'login'
    ]);

    this.auth.removeToken();

    this.username = '';

    this.tenantID = '';
  }


  // ============================================================
  // FULLSCREEN
  // ============================================================

  toggleFullscreen(): void {

    if (!document.fullscreenElement) {

      document.documentElement
        .requestFullscreen();

      this.isFullscreen = true;

    } else {

      document.exitFullscreen();

      this.isFullscreen = false;
    }
  }


  // ============================================================
  // RIGHT NAV
  // ============================================================

  openRightNav(): void {

    this.isOpenRightNav =
      !this.isOpenRightNav;
  }

  refreshSystem(): void {
  window.location.reload();
}


  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  toggleNotifications(): void {

    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen) {
      this.searchOpen = false;
      this.profile = false;
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  onNotificationClick(notification: AppNotification): void {

    this.notificationService.markAsRead(notification.uid);

    if (notification.route) {

      this.router.navigate([notification.route]);

      this.notificationsOpen = false;

      this.closeSidenavIfMobile();
    }
  }

  markAllNotificationsRead(): void {
    this.notificationService.markAllAsRead();
  }


  // ============================================================
  // SEARCH
  // ============================================================

  openSearch(): void {

    this.searchOpen = true;
    this.notificationsOpen = false;
    this.profile = false;
    this.searchQuery = '';
    this.activeResultIndex = 0;
    this.searchResults = this.globalSearch.index;

    setTimeout(() => this.searchInputRef?.nativeElement.focus());
  }

  closeSearch(): void {
    this.searchOpen = false;
  }

  onSearchInput(): void {

    const query = this.searchQuery.trim().toLowerCase();

    this.activeResultIndex = 0;

    if (!query) {
      this.searchResults = this.globalSearch.index;
      return;
    }

    this.searchResults = this.globalSearch.index.filter(item => {

      const label = this.translate.instant(item.labelKey) as string;

      return label.toLowerCase().includes(query);
    });
  }

  onSearchKeydown(event: KeyboardEvent): void {

    if (event.key === 'ArrowDown') {

      event.preventDefault();

      this.activeResultIndex = Math.min(
        this.activeResultIndex + 1,
        this.searchResults.length - 1
      );

    } else if (event.key === 'ArrowUp') {

      event.preventDefault();

      this.activeResultIndex = Math.max(this.activeResultIndex - 1, 0);

    } else if (event.key === 'Enter') {

      event.preventDefault();

      const result = this.searchResults[this.activeResultIndex];

      if (result) {
        this.selectSearchResult(result);
      }

    } else if (event.key === 'Escape') {

      this.closeSearch();
    }
  }

  selectSearchResult(item: SearchItem): void {

    this.router.navigate([item.route]);

    this.closeSearch();

    this.closeSidenavIfMobile();
  }


  // ============================================================
  // HELP
  // ============================================================

  openHelp(): void {

    this.dialog.open(HelpDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
    });
  }


  // ============================================================
  // PROFILE DIALOG
  // ============================================================

  openProfileDialog(): void {

    this.profile = false;

    const dialogRef = this.dialog.open(ProfileDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      data: {
        fullName: this.fullName,
        email: this.email,
        role: this.role,
        branchName: this.branchName,
        profilePic: this.profilePic,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.imageName) {
        this.uploadedImage.load(result.imageName).subscribe((url) => {
          this.profilePic = url ?? this.profilePic;
          this.cdr.markForCheck();
        });
      }
    });
  }

  openChangePasswordDialog(): void {

    this.profile = false;

    this.dialog.open(ChangePasswordDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
    });
  }

  openSubscribeDialog(): void {

    this.profile = false;

    const dialogRef = this.dialog.open(SubscribeDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: { subscriptionAmount: this.subscriptionAmount },
    });

    dialogRef.afterClosed().subscribe(() => {
      if (this.branchUID) {
        this.findBranchByUID(this.branchUID);
      }
      this.startSubscriptionStatusPolling();
    });
  }


  // ============================================================
  // SETTINGS SHORTCUT
  // ============================================================

  goToSettings(): void {

    this.router.navigate(['/settings']);

    this.closeSidenavIfMobile();
  }


  // ============================================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ============================================================

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {

    const isSearchShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';

    if (isSearchShortcut) {

      event.preventDefault();

      this.openSearch();

      return;
    }

    if (event.key === 'Escape') {

      if (this.searchOpen) {
        this.closeSearch();
      } else if (this.notificationsOpen) {
        this.closeNotifications();
      } else if (this.profile) {
        this.profile = false;
      }
    }
  }


}
