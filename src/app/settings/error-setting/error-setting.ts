import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { ErrorLog, ErrorLogService } from '../../Utils/services/error-log-service';
import { ErrorDetailDialogComponent } from '../../Utils/component/dialogs/error-detail-dialog-component/error-detail-dialog-component';
import { ComfirmDialogComponent } from '../../Utils/component/comfirm-dialog/comfirm-dialog';

@Component({
  selector: 'app-error-setting',
  imports: [Title2, CommonModule, TranslatePipe],
  templateUrl: './error-setting.html',
  styleUrl: './error-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private errorLogService: ErrorLogService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.errors = 'ERROR_SETTING_PAGE.MANAGE_TAB';
    this.loadErrors();
    this.loadSummary();
  }

  titleAction: string = 'ERROR_SETTING_PAGE.TITLE';
  errors: string = '';

  titleActions = [
    { icon: 'more', title: 'ERROR_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.errors = action;
  }

  errorLogs: ErrorLog[] = [];
  isLoading = false;
  lastDayCount = 0;
  lastWeekCount = 0;

  // '' means "everything" for both of these.
  sourceFilter = '';
  levelFilter = '';

  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageNumbers: number[] = [];

  loadErrors() {
    this.isLoading = true;
    this.errorLogService
      .findErrorPage(
        { page: this.currentPage, size: this.pageSize },
        this.sourceFilter,
        this.levelFilter
      )
      .subscribe({
        next: (response) => {
          this.errorLogs = response.data || [];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorLogs = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.pageNumbers = [];
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadSummary() {
    this.errorLogService.findErrorSummary().subscribe({
      next: (response) => {
        this.lastDayCount = response.data?.lastDay ?? 0;
        this.lastWeekCount = response.data?.lastWeek ?? 0;
        this.cdr.markForCheck();
      },
      error: () => {
        this.lastDayCount = 0;
        this.lastWeekCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange(source: string, level: string) {
    this.sourceFilter = source;
    this.levelFilter = level;
    this.currentPage = 0;
    this.loadErrors();
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadErrors();
  }

  refresh() {
    this.currentPage = 0;
    this.loadErrors();
    this.loadSummary();
  }

  openDetail(errorLog: ErrorLog) {
    this.dialog.open(ErrorDetailDialogComponent, {
      width: '760px',
      maxHeight: '85vh',
      data: errorLog
    });
  }

  clearErrors() {
    const dialogRef = this.dialog.open(ComfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'ERROR_SETTING_PAGE.CLEAR_CONFIRM_TITLE',
        message: 'ERROR_SETTING_PAGE.CLEAR_CONFIRM_TEXT',
        confirmLabel: 'ERROR_SETTING_PAGE.CLEAR_CONFIRM_ACTION'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.errorLogService.clearErrors().subscribe({
        next: () => {
          this.refresh();
        },
        error: () => {
          this.cdr.markForCheck();
        }
      });
    });
  }

  /** Long messages get one line in the table; the dialog has the whole thing. */
  shortMessage(message: string): string {
    if (!message) {
      return '-';
    }
    return message.length > 120 ? message.substring(0, 120) + '...' : message;
  }

  /** com.midland.bar.Bar.Service.BarService -> BarService */
  shortType(exceptionType: string): string {
    if (!exceptionType) {
      return '-';
    }
    const parts = exceptionType.split('.');
    return parts[parts.length - 1];
  }
}
