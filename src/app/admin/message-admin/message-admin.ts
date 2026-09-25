import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { SearchBoxComponent } from '../../Utils/component/search-box/search-box.component';
import { Authentication } from '../../Utils/services/authentication';
import { BranchMessageDialogComponent } from '../../Utils/component/dialogs/branch-message-dialog-component/branch-message-dialog-component';
import { AdminService, BranchMessage } from '../admin-service';

/**
 * What branches are telling us, all of them at once.
 *
 * The default filter is the ones waiting on an answer rather than
 * everything ever sent - a list that only grows is one nobody opens twice.
 */
@Component({
  selector: 'app-message-admin',
  imports: [Title2, CommonModule, MatIconModule, TranslatePipe, SearchBoxComponent],
  templateUrl: './message-admin.html',
  styleUrl: './message-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageAdmin implements OnInit {

  constructor(
    private visibility: Authentication,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {}

  titleActions = [
    { icon: 'announce', title: 'MESSAGE_ADMIN_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  tab = '';

  messages: BranchMessage[] = [];
  loading = true;
  failed = false;

  /** NEW, IN_PROGRESS, CLOSED, or ALL. */
  status = 'NEW';
  search = '';

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  readonly statuses = ['NEW', 'IN_PROGRESS', 'CLOSED', 'ALL'];

  ngOnInit(): void {
    this.tab = 'MESSAGE_ADMIN_PAGE.MANAGE_TAB';
    this.load();
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string): void {
    this.tab = action;
  }

  onStatus(status: string): void {
    this.status = status;
    this.page = 0;
    this.load();
  }

  onSearch(term: string): void {
    this.search = term ?? '';
    this.page = 0;
    this.load();
  }

  load(): void {

    this.loading = true;
    this.failed = false;

    this.adminService.findMessages(
      { page: this.page, size: this.size, searchParam: this.search || undefined },
      this.status === 'ALL' ? undefined : this.status,
    ).subscribe({

      next: (res) => {
        this.loading = false;
        this.messages = res?.data ?? [];
        this.totalPages = res?.totalPages ?? 0;
        this.totalElements = res?.totalElements ?? 0;
        this.cdr.markForCheck();
      },

      error: () => {
        this.loading = false;
        this.failed = true;
        this.messages = [];
        this.cdr.markForCheck();
      },
    });
  }

  open(message: BranchMessage): void {
    this.dialog.open(BranchMessageDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      autoFocus: false,
      // The admin side is the one that can move a thread along.
      data: { uid: message.uid, canManage: true },
    }).afterClosed().subscribe(changed => {
      // Only when something actually happened: reloading on every close
      // would throw the list away for nothing.
      if (changed) {
        this.load();
      }
    });
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page + 1 < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  /** A line of the body, for the list - the whole thing belongs in the thread. */
  snippet(message: BranchMessage): string {
    const body = (message.body || '').replace(/\s+/g, ' ').trim();
    return body.length > 120 ? body.slice(0, 120) + '…' : body;
  }
}
