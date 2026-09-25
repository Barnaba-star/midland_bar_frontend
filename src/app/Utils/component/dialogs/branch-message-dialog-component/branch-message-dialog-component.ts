import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminService, BranchMessage } from '../../../../admin/admin-service';

export interface BranchMessageDialogData {
  uid: string;
  /** True on the Admin side, where the thread's status can also be moved. */
  canManage?: boolean;
}

/**
 * One conversation, from either end.
 *
 * The same component serves POS and Admin because it is the same thread -
 * only the status controls differ, and the backend decides who may read it
 * at all. Two copies of this would have drifted the way the empty states
 * did.
 */
@Component({
  selector: 'app-branch-message-dialog-component',
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './branch-message-dialog-component.html',
  styleUrl: './branch-message-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchMessageDialogComponent implements OnInit {

  message: BranchMessage | null = null;
  loading = true;
  failed = false;

  draft = '';
  sending = false;
  errorMessage: string | null = null;

  /** Whether anything changed, so the list behind knows to refresh. */
  private changed = false;

  readonly canManage: boolean;

  constructor(
    private dialogRef: MatDialogRef<BranchMessageDialogComponent>,
    private adminService: AdminService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private data: BranchMessageDialogData,
  ) {
    this.canManage = data?.canManage === true;
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.adminService.findMessage(this.data.uid).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.data ?? null;
        this.failed = !this.message;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      },
    });
  }

  send(): void {

    const body = this.draft.trim();
    if (!body || this.sending) {
      return;
    }

    this.sending = true;
    this.errorMessage = null;

    this.adminService.reply(this.data.uid, body).subscribe({

      next: (res) => {
        this.sending = false;
        if (!res?.data) {
          this.errorMessage = this.codeMessage(res?.message);
          this.cdr.markForCheck();
          return;
        }
        // Appended rather than refetched: the thread is already on screen
        // and a round trip would only make it blink.
        this.message?.replies?.push(res.data);
        if (this.message && !this.message.replies) {
          this.message.replies = [res.data];
        }
        this.draft = '';
        this.changed = true;
        this.cdr.markForCheck();
      },

      error: () => {
        this.sending = false;
        this.errorMessage = this.translate.instant('BRANCH_MESSAGE.SEND_FAILED');
        this.cdr.markForCheck();
      },
    });
  }

  setStatus(status: string): void {
    if (!this.canManage || !this.message) {
      return;
    }
    this.adminService.setStatus(this.data.uid, status).subscribe({
      next: (res) => {
        if (res?.data === 'SAVED' && this.message) {
          this.message.status = status;
          this.changed = true;
          this.cdr.markForCheck();
        }
      },
      error: () => { },
    });
  }

  private codeMessage(code: string | undefined): string {
    const known: Record<string, string> = {
      EMPTY: 'BRANCH_MESSAGE.EMPTY',
      TOO_LONG: 'BRANCH_MESSAGE.TOO_LONG',
      NOT_ALLOWED: 'BRANCH_MESSAGE.NOT_ALLOWED',
      NOT_FOUND: 'BRANCH_MESSAGE.NOT_FOUND',
    };
    return this.translate.instant(known[code ?? ''] ?? 'BRANCH_MESSAGE.SEND_FAILED');
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }
}
