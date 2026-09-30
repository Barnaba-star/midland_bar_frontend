import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { UserService } from '../../../../settings/users-setting/user-service';

interface BranchRef {
  uid: string;
  branchName: string;
  branchCode: string;
}

/**
 * The branches a user may work in besides their home branch. A user with
 * any is asked at login which one to work in. Closes true once saved.
 */
@Component({
  selector: 'app-user-branches-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <div class="d-dialog">
      <h3>{{ 'USER_BRANCHES.TITLE' | translate: { name: data.name } }}</h3>
      <p class="d-sub">{{ 'USER_BRANCHES.SUBTITLE' | translate }}</p>
      @if (!loaded) {
        <p class="d-sub">{{ 'USER_BRANCHES.LOADING' | translate }}</p>
      } @else {
        <div class="d-list">
          @if (home) {
            <label class="d-item">
              <input type="checkbox" checked disabled />
              <span><b>{{ home.branchName }}</b><small>{{ home.branchCode }}</small></span>
              <span class="d-tag">{{ 'BRANCH_CHOICE.HOME' | translate }}</span>
            </label>
          }
          @for (b of others; track b.uid) {
            <label class="d-item">
              <input type="checkbox" [checked]="chosen.has(b.uid)" (change)="toggle(b.uid)" />
              <span><b>{{ b.branchName }}</b><small>{{ b.branchCode }}</small></span>
            </label>
          } @empty {
            <p class="d-sub">{{ 'USER_BRANCHES.NO_OTHERS' | translate }}</p>
          }
        </div>
      }
      <div class="d-actions">
        <button type="button" class="d-btn" (click)="cancel()">{{ 'COMMON.CANCEL' | translate }}</button>
        <button type="button" class="d-btn primary" [disabled]="!loaded || saving" (click)="save()">
          <mat-icon>save</mat-icon>{{ 'USER_BRANCHES.SAVE' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .d-dialog { display: flex; flex-direction: column; gap: 14px; padding: 20px; color: var(--color-text); background: var(--color-surface); }
    h3 { margin: 0; }
    .d-sub { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); }
    .d-list { display: flex; flex-direction: column; gap: 8px; }
    .d-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg);
      color: var(--color-text); font: inherit; text-align: left; cursor: pointer;
    }
    .d-item:hover:not(:disabled) { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent) inset; }
    .d-item mat-icon { color: var(--color-accent); }
    .d-item span { display: flex; flex-direction: column; flex: 1; }
    .d-item small { color: var(--color-text-muted); }
    .d-item input { width: 18px; height: 18px; accent-color: var(--color-accent); }
    .d-tag { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--color-border); color: var(--color-text-muted); }
    .d-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .d-btn {
      display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 14px;
      border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface);
      color: var(--color-text); font: inherit; font-weight: 600; cursor: pointer;
    }
    .d-btn.primary { background: var(--color-accent); border-color: var(--color-accent); color: #1d1812; }
    .d-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserBranchesDialogComponent {
  home: BranchRef | null = null;
  /** Every working branch but the home one and the main office. */
  others: BranchRef[] = [];
  chosen = new Set<string>();
  loaded = false;
  saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { userUID: string; name: string },
    private dialogRef: MatDialogRef<UserBranchesDialogComponent, boolean>,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {
    forkJoin([userService.findUserBranches(data.userUID), userService.findBranchList()]).subscribe({
      next: ([mine, all]) => {
        this.home = mine.data?.home ?? null;
        (mine.data?.extra ?? []).forEach((b: BranchRef) => this.chosen.add(b.uid));
        this.others = (all.data ?? [])
          .filter((b: any) => b.uid !== this.home?.uid && (b.branchCode ?? '').toUpperCase() !== 'ROOT')
          .map((b: any) => ({ uid: b.uid, branchName: b.branchName ?? b.name, branchCode: b.branchCode }));
        this.loaded = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loaded = true;
        this.cdr.markForCheck();
      },
    });
  }

  toggle(uid: string): void {
    if (this.chosen.has(uid)) {
      this.chosen.delete(uid);
    } else {
      this.chosen.add(uid);
    }
  }

  save(): void {
    this.saving = true;
    this.userService.saveUserBranches({ userUID: this.data.userUID, branchUIDs: [...this.chosen] }).subscribe({
      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.dialogRef.close(true);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
