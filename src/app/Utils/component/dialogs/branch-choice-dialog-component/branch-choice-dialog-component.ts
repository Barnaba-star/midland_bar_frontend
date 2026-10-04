import { ChangeDetectionStrategy, Component, Inject, computed, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface BranchChoice {
  uid: string;
  branchName: string;
  branchCode: string;
  home: boolean;
  /** STAFF in a customer's branch: they may look, not change. */
  viewOnly?: boolean;
}

/** At login, for a user of several branches: which one to work in this time. Closes with its uid. */
@Component({
  selector: 'app-branch-choice-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <div class="d-dialog">
      <h3>{{ 'BRANCH_CHOICE.TITLE' | translate }}</h3>
      <p class="d-sub">{{ 'BRANCH_CHOICE.SUBTITLE' | translate }}</p>
      <!-- ROOT and DIRECTOR see every branch: a search once the list is long. -->
      @if (data.branches.length > 6) {
        <input class="d-search" type="search" [value]="term()" (input)="term.set($any($event.target).value)"
               [placeholder]="'BRANCH_CHOICE.SEARCH' | translate" />
      }
      <div class="d-list">
        @for (b of shown(); track b.uid) {
          <button type="button" class="d-item" [class.home]="b.home" (click)="pick(b)">
            <mat-icon>{{ b.home ? 'home_work' : 'storefront' }}</mat-icon>
            <span><b>{{ b.branchName }}</b><small>{{ b.branchCode }}</small></span>
            @if (b.home) { <span class="d-tag default">{{ 'BRANCH_CHOICE.DEFAULT' | translate }}</span> }
            @if (b.viewOnly) { <span class="d-tag">{{ 'BRANCH_CHOICE.VIEW_ONLY' | translate }}</span> }
          </button>
        } @empty {
          <p class="d-sub">{{ 'BRANCH_CHOICE.NONE_MATCH' | translate }}</p>
        }
      </div>
      <div class="d-actions">
        <button type="button" class="d-btn" (click)="cancel()">{{ 'COMMON.CANCEL' | translate }}</button>
      </div>
    </div>
  `,
  styles: [`
    .d-dialog { display: flex; flex-direction: column; gap: 14px; padding: 20px; color: var(--color-text); background: var(--color-surface); }
    h3 { margin: 0; }
    .d-sub { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); }
    .d-list { display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; }
    .d-search {
      height: 40px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);
      background: var(--color-bg); color: var(--color-text); font: inherit;
    }
    .d-item.home { border-color: var(--color-accent); }
    .d-tag.default { background: var(--color-accent); border-color: var(--color-accent); color: #1d1812; font-weight: 700; }
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
    .d-item .d-tag { flex: none; }
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
export class BranchChoiceDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { branches: BranchChoice[] },
    private dialogRef: MatDialogRef<BranchChoiceDialogComponent, string>,
  ) {}

  readonly term = signal('');
  /** MIDLAND (home) first - the default - then the rest, narrowed by the search. */
  readonly shown = computed(() => {
    const t = this.term().trim().toLowerCase();
    const sorted = [...this.data.branches].sort((a, b) => Number(b.home) - Number(a.home));
    return t ? sorted.filter((b) => `${b.branchName} ${b.branchCode}`.toLowerCase().includes(t)) : sorted;
  });

  pick(branch: BranchChoice): void {
    this.dialogRef.close(branch.uid);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
