import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface PurgeBranchData {
  branchName: string;
  branchCode: string;
  /** i18n group for the texts; PURGE_PERIOD (clear a period) by default. */
  textKey?: string;
  /** Set when only a period is cleared (yyyy-MM-dd), shown under the branch. */
  from?: string;
  to?: string;
}

/**
 * The last check before a branch's records are cleared: says what goes and what
 * stays, and opens the button only once the branch code is typed back.
 * Closes with the typed code (the backend checks it again), or nothing.
 */
@Component({
  selector: 'app-purge-branch-dialog',
  imports: [MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb">
      <span class="pb-icon"><mat-icon>delete_forever</mat-icon></span>
      <h2>{{ k + '.TITLE' | translate }}</h2>
      <p class="pb-branch">{{ data.branchName }} <code>{{ data.branchCode }}</code></p>
      @if (data.from && data.to) {
        <p class="pb-period">{{ k + '.PERIOD' | translate: { from: data.from, to: data.to } }}</p>
      }

      <div class="pb-lists">
        <div class="pb-list gone">
          <strong>{{ k + '.GOES' | translate }}</strong>
          <p>{{ k + '.GOES_LIST' | translate }}</p>
        </div>
        <div class="pb-list kept">
          <strong>{{ k + '.STAYS' | translate }}</strong>
          <p>{{ k + '.STAYS_LIST' | translate }}</p>
        </div>
      </div>

      <p class="pb-warn"><mat-icon>warning</mat-icon>{{ k + '.NO_UNDO' | translate }}</p>

      <label for="pb-code">{{ k + '.TYPE_CODE' | translate: { code: data.branchCode } }}</label>
      <input id="pb-code" type="text" autocomplete="off" spellcheck="false"
             [value]="typed()" (input)="typed.set($any($event.target).value)"
             [placeholder]="data.branchCode">

      <div class="pb-actions">
        <button type="button" class="pb-cancel" (click)="ref.close()">{{ 'COMMON.CANCEL' | translate }}</button>
        <button type="button" class="pb-go" [disabled]="!matches()" (click)="ref.close(typed().trim())">
          <mat-icon>delete_forever</mat-icon>{{ k + '.CONFIRM' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pb { padding: 20px 20px 16px; text-align: center; font-family: var(--font-sans); background: var(--color-surface); color: var(--color-text); }
    .pb-icon {
      display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 50%;
      background: color-mix(in srgb, #c0392b 14%, var(--color-surface)); color: #c0392b;
    }
    .pb-icon mat-icon { font-size: 32px; width: 32px; height: 32px; }
    h2 { margin: 14px 0 4px; font-size: 20px; color: var(--color-text); }
    .pb-period { margin: -10px 0 16px; font-size: 13px; color: var(--color-text-muted); }
    .pb-branch { margin: 0 0 16px; font-weight: 600; color: var(--color-text); }
    .pb-branch code {
      margin-left: 6px; padding: 2px 8px; border-radius: 6px;
      background: var(--color-accent-light); color: var(--color-accent-dark); font-size: 13px;
    }
    .pb-lists { display: grid; gap: 10px; text-align: left; }
    .pb-list { padding: 12px 14px; border-radius: 12px; border: 1px solid var(--color-border); }
    .pb-list strong { font-size: 13px; }
    .pb-list p { margin: 4px 0 0; font-size: 13px; line-height: 1.55; color: var(--color-text-muted); }
    .pb-list.gone { background: color-mix(in srgb, #c0392b 8%, var(--color-surface)); border-color: color-mix(in srgb, #c0392b 30%, var(--color-border)); }
    .pb-list.gone strong { color: #c0392b; }
    .pb-list.kept { background: color-mix(in srgb, #2e7d32 8%, var(--color-surface)); border-color: color-mix(in srgb, #2e7d32 30%, var(--color-border)); }
    .pb-list.kept strong { color: #2e7d32; }
    .pb-warn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin: 14px 0; font-size: 13px; font-weight: 600; color: #c0392b;
    }
    .pb-warn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    label { display: block; margin-bottom: 6px; text-align: left; font-size: 13px; font-weight: 600; color: var(--color-text); }
    input {
      width: 100%; box-sizing: border-box; height: 46px; padding: 0 14px;
      border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-bg);
      font: 600 15px var(--font-sans); letter-spacing: .04em; color: var(--color-text);
    }
    input:focus { outline: none; border-color: var(--color-accent); }
    .pb-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 18px; }
    .pb-actions button {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 46px; border-radius: 12px; font: 600 14px var(--font-sans); cursor: pointer;
    }
    .pb-cancel { border: 1px solid var(--color-border); background: transparent; color: var(--color-text); }
    .pb-go { border: 0; background: #c0392b; color: #fff; }
    .pb-go:disabled { opacity: .4; cursor: not-allowed; }
    .pb-go mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class PurgeBranchDialogComponent {
  readonly data = inject<PurgeBranchData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<PurgeBranchDialogComponent, string>);
  readonly k = this.data.textKey || 'PURGE_PERIOD';
  readonly typed = signal('');
  readonly matches = computed(() => this.typed().trim().toUpperCase() === (this.data.branchCode || '').toUpperCase());
}
