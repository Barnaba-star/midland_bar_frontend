import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { TitleAction, TitleComponent } from "../../Utils/component/title/title.component";
import { MatIconModule } from "@angular/material/icon";
import { Authentication } from '../../Utils/services/authentication';
import { Title2 } from "../../Utils/component/title2/title2";
import { TranslatePipe } from '@ngx-translate/core';
import { PlatformSetting, PlatformSettingService } from './platform-setting-service';

@Component({
  selector: 'app-configuration',
  imports: [MatIconModule, Title2, TranslatePipe, FormsModule],
  templateUrl: './configuration.html',
  styleUrl: './configuration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuration implements OnInit {

constructor(
  private dialog:MatDialog,
  private visibility:Authentication,
  private platformSettingService: PlatformSettingService,
  private cdr: ChangeDetectorRef,
) {}

selectedConfiguration = '';
titleActions = [
  { icon: 'setting', title: 'CONFIGURATION_PAGE.GENERAL' , roles: ['ROOT']},
];

// What the form edits.
setting: PlatformSetting = this.emptySetting();

// The last thing the server handed us, so Reset can put it back
// without another round trip.
private loadedSetting: PlatformSetting = this.emptySetting();

isLoading = false;
isSaving = false;

ngOnInit(): void {
  // GENERAL is ROOT-only, so it opens by default only for the roles that
  // can actually see the tab - anyone else keeps the old overview page.
  const visible = this.getTitled(this.titleActions);
  const general = visible.find((action) => action.title === 'CONFIGURATION_PAGE.GENERAL');

  if (general) {
    this.selectedConfiguration = 'CONFIGURATION_PAGE.GENERAL';
    this.loadPlatformSetting();
  }
}

onAction(action: string) {
    this.selectedConfiguration = action;

    // Only fetched once; coming back to the tab keeps whatever is on screen.
    if (action === 'CONFIGURATION_PAGE.GENERAL' && !this.loadedSetting.uid && !this.isLoading) {
      this.loadPlatformSetting();
    }
  }

getTitled(title:TitleAction[]):TitleAction[]{
return this.visibility.filteredTitleActions(title);
}

loadPlatformSetting(): void {
  this.isLoading = true;
  this.platformSettingService.findPlatformSetting().subscribe({
    next: (response) => {
      if (response.data) {
        this.loadedSetting = { ...response.data };
        this.setting = { ...response.data };
      }
      this.isLoading = false;
      this.cdr.markForCheck();
    },
    error: () => {
      // The interceptor already told the user what went wrong.
      this.isLoading = false;
      this.cdr.markForCheck();
    },
  });
}

savePlatformSetting(): void {
  this.isSaving = true;
  this.platformSettingService.savePlatformSetting(this.setting).subscribe({
    next: (response) => {
      // A rejected save comes back as a message with no data; the
      // interceptor shows it, and we keep what the user typed.
      if (response.data) {
        this.loadedSetting = { ...response.data };
        this.setting = { ...response.data };
      }
      this.isSaving = false;
      this.cdr.markForCheck();
    },
    error: () => {
      this.isSaving = false;
      this.cdr.markForCheck();
    },
  });
}

resetPlatformSetting(): void {
  this.setting = { ...this.loadedSetting };
  this.cdr.markForCheck();
}

private emptySetting(): PlatformSetting {
  return {
    commissionPercent: 0,
    directorPercent: 0,
    rootPercent: 0,
    trialDays: 0,
    gracePeriodDays: 0,
    minimumPaymentAmount: 0,
    defaultSubscriptionAmount: 0,
    defaultSubscriptionDays: 0,
    sessionHours: 0,
    lowStockLevel: 0,
    errorRetentionDays: 0,
    errorPurgeDays: 0,
  };
}
}
