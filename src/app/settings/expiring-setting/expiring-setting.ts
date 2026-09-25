import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { ExpiringBranch, ExpiringService } from './expiring-service';

@Component({
  selector: 'app-expiring-setting',
  imports: [Title2, CommonModule, TranslatePipe],
  templateUrl: './expiring-setting.html',
  styleUrl: './expiring-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpiringSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private expiringService: ExpiringService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.expiring = 'EXPIRING_SETTING_PAGE.MANAGE_TAB';
    this.loadBranches();
  }

  titleAction: string = 'EXPIRING_SETTING_PAGE.TITLE';
  expiring: string = '';

  // STAFF get the tab too - the backend narrows the list to their own branches.
  titleActions = [
    { icon: 'calender', title: 'EXPIRING_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR', 'STAFF'] }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.expiring = action;
  }

  branches: ExpiringBranch[] = [];
  isLoading = false;

  /** 30 by default so both the already-lapsed and the upcoming ones show up. */
  windowDays = 30;

  windowOptions = [
    { value: 7,  label: 'EXPIRING_SETTING_PAGE.WINDOW_7' },
    { value: 14, label: 'EXPIRING_SETTING_PAGE.WINDOW_14' },
    { value: 30, label: 'EXPIRING_SETTING_PAGE.WINDOW_30' },
    { value: 90, label: 'EXPIRING_SETTING_PAGE.WINDOW_90' }
  ];

  expiredCount = 0;
  soonCount = 0;

  loadBranches() {
    this.isLoading = true;
    this.expiringService.findExpiringBranches(this.windowDays).subscribe({
      next: (response) => {
        this.branches = response.data || [];
        this.recount();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.branches = [];
        this.recount();
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /** Counted once per load rather than in the template, which would re-run it. */
  private recount() {
    this.expiredCount = this.branches.filter(branch => branch.daysLeft < 0).length;
    this.soonCount = this.branches.filter(
      branch => branch.daysLeft >= 0 && branch.daysLeft <= 7
    ).length;
  }

  onWindowChange(days: string) {
    this.windowDays = Number(days);
    this.loadBranches();
  }

  refresh() {
    this.loadBranches();
  }

  /** The days-left number a lapsed row shows: -2 reads as "2 days ago". */
  lapsedDays(branch: ExpiringBranch): number {
    return -branch.daysLeft;
  }
}
