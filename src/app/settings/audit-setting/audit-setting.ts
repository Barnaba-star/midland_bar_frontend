import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { AlertService } from '../../Utils/services/alert';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';
import { AuditDetailDialogComponent } from '../../Utils/component/dialogs/audit-detail-dialog-component/audit-detail-dialog-component';
import { PurgeAuditDialogComponent } from '../../Utils/component/dialogs/purge-audit-dialog-component/purge-audit-dialog-component';
import { AuditLog, AuditService } from './audit-service';

@Component({
  selector: 'app-audit-setting',
  imports: [Title2, CommonModule, TranslatePipe, SearchBoxComponent],
  templateUrl: './audit-setting.html',
  styleUrl: './audit-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditSetting implements OnInit {

  constructor(
    private visibility: Authentication,
    private auditService: AuditService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private alert: AlertService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.audits = 'AUDIT_SETTING_PAGE.MANAGE_TAB';
    this.loadAudits();
    this.loadSummary();
    this.loadStorage();
  }

  titleAction: string = 'AUDIT_SETTING_PAGE.TITLE';
  audits: string = '';

  titleActions = [
    { icon: 'history', title: 'AUDIT_SETTING_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
    this.audits = action;
  }

  auditLogs: AuditLog[] = [];
  isLoading = false;
  lastDayCount = 0;
  lastWeekCount = 0;
  activeUsersCount = 0;

  /** How much is old enough to be removed; all zero until storage loads. */
  storageTotal = 0;
  olderThan30Count = 0;
  olderThan90Count = 0;
  olderThan365Count = 0;
  purging = false;

  /** '' means "everything". */
  outcomeFilter = '';
  searchParam = '';

  currentPage = 0;
  pageSize = 20;
  totalPages = 0;
  totalElements = 0;
  pageNumbers: number[] = [];

  loadAudits() {
    this.isLoading = true;
    this.auditService
      .findAuditPage(
        { page: this.currentPage, size: this.pageSize, searchParam: this.searchParam },
        // Searching goes through searchParam; the username param stays free for
        // a future "show me only this person" link.
        undefined,
        this.outcomeFilter
      )
      .subscribe({
        next: (response) => {
          this.auditLogs = response.data || [];
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
          this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.auditLogs = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.pageNumbers = [];
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadSummary() {
    this.auditService.findAuditSummary().subscribe({
      next: (response) => {
        this.lastDayCount = response.data?.lastDay ?? 0;
        this.lastWeekCount = response.data?.lastWeek ?? 0;
        this.activeUsersCount = response.data?.activeUsers ?? 0;
        this.cdr.markForCheck();
      },
      error: () => {
        this.lastDayCount = 0;
        this.lastWeekCount = 0;
        this.activeUsersCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  loadStorage() {
    this.auditService.findAuditStorage().subscribe({
      next: (response) => {
        this.storageTotal = response.data?.total ?? 0;
        this.olderThan30Count = response.data?.olderThan30 ?? 0;
        this.olderThan90Count = response.data?.olderThan90 ?? 0;
        this.olderThan365Count = response.data?.olderThan365 ?? 0;
        this.cdr.markForCheck();
      },
      error: () => {
        this.storageTotal = 0;
        this.olderThan30Count = 0;
        this.olderThan90Count = 0;
        this.olderThan365Count = 0;
        this.cdr.markForCheck();
      }
    });
  }

  /** A new term is a new result set, so it always starts from the first page. */
  onSearchChange(term: string) {
    this.searchParam = term;
    this.currentPage = 0;
    this.loadAudits();
  }

  onFilterChange(outcome: string) {
    this.outcomeFilter = outcome;
    this.currentPage = 0;
    this.loadAudits();
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.loadAudits();
  }

  refresh() {
    this.currentPage = 0;
    this.loadAudits();
    this.loadSummary();
    this.loadStorage();
  }

  /**
   * Offered whenever there is anything in the log at all: the backend keeps
   * the last 7 days itself, and the dialog shows what each age would remove.
   */
  get canPurge(): boolean {
    return this.storageTotal > 0;
  }

  openPurge() {
    const dialogRef = this.dialog.open(PurgeAuditDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: {
        total: this.storageTotal,
        olderThan30: this.olderThan30Count,
        olderThan90: this.olderThan90Count,
        olderThan365: this.olderThan365Count
      }
    });

    dialogRef.afterClosed().subscribe((days: number | undefined) => {

      if (!days) {
        return;
      }

      this.purging = true;
      this.cdr.markForCheck();

      this.auditService.purgeAuditLog(days).subscribe({
        next: (response) => {
          this.purging = false;

          // The call answers 200 either way, so success is read off `data`.
          // Zero removed is still a success - there was simply nothing there.
          if (typeof response?.data === 'number') {
            this.alert.show(
              'success',
              this.translate.instant('AUDIT_SETTING_PAGE.PURGE_SUCCESS', { count: response.data })
            );
            this.currentPage = 0;
            this.loadAudits();
            this.loadSummary();
            this.loadStorage();
          } else {
            this.alert.show('error', response?.message || '');
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.purging = false;
          console.error('Audit purge error:', error);
          this.alert.show('error', error?.error?.message || '');
          this.cdr.markForCheck();
        }
      });
    });
  }

  openDetail(auditLog: AuditLog) {
    this.dialog.open(AuditDetailDialogComponent, {
      width: '760px',
      maxHeight: '85vh',
      data: auditLog
    });
  }

  /** The full name is what a reader recognises; the username is the fallback. */
  displayUser(auditLog: AuditLog): string {
    return auditLog.fullName || auditLog.username || '-';
  }
}
