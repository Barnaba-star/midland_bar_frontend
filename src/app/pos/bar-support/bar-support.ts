import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2, TitleAction } from '../../Utils/component/title2/title2';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { BranchMessageDialogComponent } from '../../Utils/component/dialogs/branch-message-dialog-component/branch-message-dialog-component';
import { Authentication } from '../../Utils/services/authentication';
import { AdminService, BranchMessage } from '../../admin/admin-service';

/**
 * The branch's side of the conversation: what it has asked, and what came
 * back.
 *
 * Only this branch's own threads are listed - the backend scopes
 * findMyMessages to the token's branch, so nothing here picks one.
 */
@Component({
  selector: 'app-bar-support',
  imports: [Title2, EmptyStateComponent, FormsModule, MatIconModule, TranslatePipe, DatePipe],
  templateUrl: './bar-support.html',
  styleUrl: './bar-support.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSupport implements OnInit {

  constructor(
    private visibility: Authentication,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {}

  // No roles listed: raising a question is not a privilege, so every POS
  // role that reaches the page sees the tab.
  titleActions: TitleAction[] = [
    { icon: 'announce', title: 'SUPPORT_PAGE.MANAGE_TAB' }
  ];

  tab = '';

  messages: BranchMessage[] = [];
  loading = true;
  failed = false;

  // ---- the new message form ----

  formOpen = false;
  category = 'COMMENT';
  subject = '';
  body = '';
  sending = false;

  /** Translation key of the last send's outcome, shown above the list. */
  feedback: string | null = null;
  feedbackFailed = false;

  readonly categories = ['COMMENT', 'QUESTION', 'COMPLAINT'];

  ngOnInit(): void {
    this.tab = 'SUPPORT_PAGE.MANAGE_TAB';
    this.load();
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string): void {
    this.tab = action;
  }

  load(): void {

    this.loading = true;
    this.failed = false;

    this.adminService.findMyMessages().subscribe({

      next: (res) => {
        this.loading = false;
        this.messages = res?.data ?? [];
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

  toggleForm(): void {
    this.formOpen = !this.formOpen;
    if (this.formOpen) {
      this.feedback = null;
    }
  }

  cancel(): void {
    this.formOpen = false;
    this.resetForm();
  }

  send(): void {

    const body = this.body.trim();
    if (!body || this.sending) {
      return;
    }

    this.sending = true;
    this.feedback = null;

    this.adminService.raise(this.category, this.subject.trim(), body).subscribe({

      next: (res) => {
        this.sending = false;

        if (!res?.data) {
          this.feedback = 'SUPPORT_PAGE.SEND_FAILED';
          this.feedbackFailed = true;
          this.cdr.markForCheck();
          return;
        }

        // Put it straight at the top rather than refetching: the thread the
        // branch just wrote is the one it wants to see, and newest first is
        // the order the list is already in.
        this.messages = [res.data, ...this.messages];
        this.formOpen = false;
        this.feedback = 'SUPPORT_PAGE.SENT';
        this.feedbackFailed = false;
        this.resetForm();
        this.cdr.markForCheck();
      },

      error: () => {
        this.sending = false;
        this.feedback = 'SUPPORT_PAGE.SEND_FAILED';
        this.feedbackFailed = true;
        this.cdr.markForCheck();
      },
    });
  }

  open(message: BranchMessage): void {
    this.dialog.open(BranchMessageDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      autoFocus: false,
      // The branch reads and replies; moving a thread's status is the admin's.
      data: { uid: message.uid, canManage: false },
    }).afterClosed().subscribe(changed => {
      // Only when a reply actually went out - reloading on every close would
      // throw the list away for nothing.
      if (changed) {
        this.load();
      }
    });
  }

  /** A line of the body, for the list - the whole thing belongs in the thread. */
  snippet(message: BranchMessage): string {
    const body = (message.body || '').replace(/\s+/g, ' ').trim();
    return body.length > 120 ? body.slice(0, 120) + '…' : body;
  }

  private resetForm(): void {
    this.category = 'COMMENT';
    this.subject = '';
    this.body = '';
  }
}
