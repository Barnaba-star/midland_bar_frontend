import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface BlockBranchData {
  branchName: string;
  branchCode: string;
  /** true: the branch is blocked now and this asks to unblock it. */
  unblock?: boolean;
}

/** What the dialog closes with when confirmed; nothing when cancelled. */
export interface BlockBranchResult {
  reason: string;
}

/**
 * Block or unblock a branch from the main office. Blocking says plainly what
 * follows - nobody in the branch signs in or works until it is unblocked,
 * and nothing is deleted - and asks for a reason, which the branch is shown
 * at sign-in. Unblocking is a plain confirmation.
 */
@Component({
  selector: 'app-block-branch-dialog',
  imports: [MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bb" [class.unblock]="data.unblock">
      <span class="bb-icon"><mat-icon>{{ data.unblock ? 'lock_open' : 'block' }}</mat-icon></span>
      <h2>{{ (data.unblock ? 'BLOCK_BRANCH.UNBLOCK_TITLE' : 'BLOCK_BRANCH.TITLE') | translate }}</h2>
      <p class="bb-branch">{{ data.branchName }} <code>{{ data.branchCode }}</code></p>

      @if (data.unblock) {
        <p class="bb-text">{{ 'BLOCK_BRANCH.UNBLOCK_TEXT' | translate }}</p>
      } @else {
        <div class="bb-lists">
          <div class="bb-list gone">
            <strong>{{ 'BLOCK_BRANCH.WHAT_HAPPENS' | translate }}</strong>
            <p>{{ 'BLOCK_BRANCH.WHAT_HAPPENS_TEXT' | translate }}</p>
          </div>
          <div class="bb-list kept">
            <strong>{{ 'BLOCK_BRANCH.DATA_KEPT' | translate }}</strong>
            <p>{{ 'BLOCK_BRANCH.DATA_KEPT_TEXT' | translate }}</p>
          </div>
        </div>

        <label for="bb-reason">{{ 'BLOCK_BRANCH.REASON_LABEL' | translate }}</label>
        <textarea id="bb-reason" rows="3" maxlength="500"
                  [value]="reason()" (input)="reason.set($any($event.target).value)"
                  [placeholder]="'BLOCK_BRANCH.REASON_PLACEHOLDER' | translate"></textarea>
        <p class="bb-hint">{{ 'BLOCK_BRANCH.REASON_HINT' | translate }}</p>
      }

      <div class="bb-actions">
        <button type="button" class="bb-cancel" (click)="ref.close()">{{ 'COMMON.CANCEL' | translate }}</button>
        <button type="button" class="bb-go" (click)="confirm()">
          <mat-icon>{{ data.unblock ? 'lock_open' : 'block' }}</mat-icon>
          {{ (data.unblock ? 'BLOCK_BRANCH.UNBLOCK_CONFIRM' : 'BLOCK_BRANCH.CONFIRM') | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bb { padding: 20px 20px 16px; text-align: center; font-family: var(--font-sans); background: var(--color-surface); color: var(--color-text); }
    .bb-icon {
      display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 50%;
      background: color-mix(in srgb, #c0392b 14%, var(--color-surface)); color: #c0392b;
    }
    .unblock .bb-icon { background: color-mix(in srgb, #2e7d32 14%, var(--color-surface)); color: #2e7d32; }
    .bb-icon mat-icon { font-size: 32px; width: 32px; height: 32px; }
    h2 { margin: 14px 0 4px; font-size: 20px; color: var(--color-text); }
    .bb-branch { margin: 0 0 16px; font-weight: 600; font-size: 15px; color: var(--color-text); overflow-wrap: anywhere; }
    .bb-branch code {
      margin-left: 6px; padding: 2px 8px; border-radius: 6px;
      background: var(--color-accent-light); color: var(--color-accent-dark); font-size: 13px;
    }
    .bb-text { margin: 0 0 4px; font-size: 14px; line-height: 1.55; color: var(--color-text-muted); }
    .bb-lists { display: grid; gap: 10px; text-align: left; }
    .bb-list { padding: 12px 14px; border-radius: 12px; border: 1px solid var(--color-border); }
    .bb-list strong { font-size: 13px; }
    .bb-list p { margin: 4px 0 0; font-size: 13px; line-height: 1.55; color: var(--color-text-muted); }
    .bb-list.gone { background: color-mix(in srgb, #c0392b 8%, var(--color-surface)); border-color: color-mix(in srgb, #c0392b 30%, var(--color-border)); }
    .bb-list.gone strong { color: #c0392b; }
    .bb-list.kept { background: color-mix(in srgb, #2e7d32 8%, var(--color-surface)); border-color: color-mix(in srgb, #2e7d32 30%, var(--color-border)); }
    .bb-list.kept strong { color: #2e7d32; }
    label { display: block; margin: 16px 0 6px; text-align: left; font-size: 13px; font-weight: 600; color: var(--color-text); }
    textarea {
      width: 100%; box-sizing: border-box; padding: 10px 14px; resize: vertical; min-height: 72px;
      border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-bg);
      font: 400 14px var(--font-sans); color: var(--color-text);
    }
    textarea:focus { outline: none; border-color: var(--color-accent); }
    .bb-hint { margin: 6px 0 0; text-align: left; font-size: 12px; color: var(--color-text-muted); }
    .bb-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 18px; }
    .bb-actions button {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 46px; padding: 0 10px; border-radius: 12px; font: 600 14px var(--font-sans); cursor: pointer;
    }
    .bb-cancel { border: 1px solid var(--color-border); background: transparent; color: var(--color-text); }
    .bb-go { border: 0; background: #c0392b; color: #fff; }
    .unblock .bb-go { background: #2e7d32; }
    .bb-go mat-icon { font-size: 18px; width: 18px; height: 18px; flex: none; }
    @media (max-width: 412px) {
      .bb { padding: 16px 14px 14px; }
    }
  `],
})
export class BlockBranchDialogComponent {
  readonly data = inject<BlockBranchData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<BlockBranchDialogComponent, BlockBranchResult>);
  readonly reason = signal('');

  confirm(): void {
    this.ref.close({ reason: this.reason().trim() });
  }
}
