import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ErrorLog } from '../../../services/error-log-service';

@Component({
  selector: 'app-error-detail-dialog-component',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './error-detail-dialog-component.html',
  styleUrl: './error-detail-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorDetailDialogComponent {

  copied = false;
  payloadCopied = false;

  /** JSON is easier to read indented; anything else is shown as it came. */
  readonly prettyPayload: string;

  constructor(
    public dialogRef: MatDialogRef<ErrorDetailDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ErrorLog
  ) {
    this.prettyPayload = this.formatPayload(data?.payload);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private formatPayload(payload: string | null | undefined): string {
    if (!payload) {
      return '';
    }
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      // A body that failed to parse is exactly the one worth seeing raw.
      return payload;
    }
  }

  copyPayload(): void {
    this.copy(this.prettyPayload, () => {
      this.payloadCopied = true;
    });
  }

  /** So a whole report can go straight into a message or a ticket. */
  copyDetails(): void {
    const text = [
      `Time: ${this.data.occurredAt}`,
      `Level: ${this.data.level}`,
      `Source: ${this.data.source}`,
      `Type: ${this.data.exceptionType}`,
      `Message: ${this.data.message}`,
      `Path: ${this.data.httpMethod ?? ''} ${this.data.path ?? ''}`,
      this.data.queryString ? `Query: ${this.data.queryString}` : '',
      `User: ${this.data.username ?? '-'}`,
      `Branch: ${this.data.branchUid ?? '-'}`,
      '',
      'Payload:',
      this.prettyPayload || '(none)',
      '',
      'Stack trace:',
      this.data.stackTrace ?? '(none)'
    ].join('\n');

    this.copy(text, () => {
      this.copied = true;
    });
  }

  private copy(text: string, onDone: () => void): void {
    navigator.clipboard?.writeText(text).then(
      () => {
        onDone();
        this.cdr.markForCheck();
      },
      () => {
        this.cdr.markForCheck();
      }
    );
  }
}
