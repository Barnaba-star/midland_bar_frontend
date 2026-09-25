import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { AlertService } from '../../Utils/services/alert';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';
import { ComfirmDialogComponent } from '../../Utils/component/comfirm-dialog/comfirm-dialog';
import { RegionDialogComponent } from '../../Utils/component/dialogs/region-dialog-component/region-dialog-component';
import { Region, RegionService } from './region-service';

@Component({
  selector: 'app-region-setting',
  imports: [Title2, CommonModule, TranslatePipe, SearchBoxComponent],
  templateUrl: './region-setting.html',
  styleUrl: './region-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private regionService: RegionService,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.regions = 'REGION_SETTING_PAGE.MANAGE_TAB';
    this.loadRegions();
  }

  titleAction: string = 'REGION_SETTING_PAGE.TITLE';
  regions: string = '';

  titleActions = [
    { icon: 'office', title: 'REGION_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT'] }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.regions = action;
  }

  /** Everything the backend has; `filteredRegions` is what the table shows. */
  allRegions: Region[] = [];
  filteredRegions: Region[] = [];
  isLoading = false;
  searchParam = '';

  loadRegions() {
    this.isLoading = true;
    this.regionService.findRegions().subscribe({
      next: (response) => {
        this.allRegions = response.data || [];
        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.allRegions = [];
        this.filteredRegions = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Twenty-six regions fit in memory several times over, so searching them
   * here costs nothing and saves a round trip per keystroke.
   */
  private applyFilter() {
    const term = this.searchParam.trim().toLowerCase();
    if (!term) {
      this.filteredRegions = [...this.allRegions];
      return;
    }
    this.filteredRegions = this.allRegions.filter(region =>
      (region.name || '').toLowerCase().includes(term) ||
      (region.code || '').toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string) {
    this.searchParam = term;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  refresh() {
    this.loadRegions();
  }

  addRegion() {
    this.openDialog(null);
  }

  editRegion(region: Region) {
    this.openDialog(region);
  }

  private openDialog(region: Region | null) {
    const dialogRef = this.dialog.open(RegionDialogComponent, {
      width: '460px',
      maxHeight: '85vh',
      data: region
    });

    dialogRef.afterClosed().subscribe((saved: Region | undefined) => {
      if (!saved) {
        return;
      }
      this.saveRegion(saved);
    });
  }

  private saveRegion(region: Region) {
    this.regionService.saveRegion(region).subscribe({
      next: (response) => {
        // A refusal is still HTTP 200 - the empty `data` is what gives it away,
        // and `message` already says which branches are in the way.
        if (!response?.data) {
          this.alertService.show('error', response?.message || this.translate.instant('REGION_SETTING_PAGE.SAVE_FAILED'));
          this.cdr.markForCheck();
          return;
        }
        this.alertService.show('success', this.translate.instant('REGION_SETTING_PAGE.SAVE_SUCCESS'));
        this.loadRegions();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  deleteRegion(region: Region) {
    const dialogRef = this.dialog.open(ComfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'REGION_SETTING_PAGE.DELETE_CONFIRM_TITLE',
        message: 'REGION_SETTING_PAGE.DELETE_CONFIRM',
        confirmLabel: 'REGION_SETTING_PAGE.DELETE'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed || !region.uid) {
        return;
      }
      this.regionService.deleteRegion(region.uid).subscribe({
        next: (response) => {
          if (!response?.data) {
            this.alertService.show('error', response?.message || this.translate.instant('REGION_SETTING_PAGE.DELETE_FAILED'));
            this.cdr.markForCheck();
            return;
          }
          this.alertService.show('success', this.translate.instant('REGION_SETTING_PAGE.DELETE_SUCCESS'));
          this.loadRegions();
        },
        error: () => {
          this.cdr.markForCheck();
        }
      });
    });
  }
}
