import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuditLog } from '../../../../settings/audit-setting/audit-service';

@Component({
  selector: 'app-audit-detail-dialog-component',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './audit-detail-dialog-component.html',
  styleUrl: './audit-detail-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditDetailDialogComponent {

  copied = false;
  payloadCopied = false;

  /** JSON is easier to read indented; anything else is shown as it came. */
  readonly prettyPayload: string;

  constructor(
    public dialogRef: MatDialogRef<AuditDetailDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: AuditLog
  ) {
    this.prettyPayload = this.formatPayload(data?.payload);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  /** The full name is what a reader recognises; the username is the fallback. */
  get displayUser(): string {
    return this.data?.fullName || this.data?.username || '-';
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

  /** So a whole record can go straight into a message or a ticket. */
  copyDetails(): void {
    const text = [
      `Time: ${this.data.occurredAt}`,
      `User: ${this.displayUser}`,
      `Branch: ${this.data.branchUid ?? '-'}`,
      `Action: ${this.data.action ?? '-'}`,
      `Outcome: ${this.data.outcome}`,
      `Path: ${this.data.httpMethod ?? ''} ${this.data.path ?? ''}`,
      this.data.queryString ? `Query: ${this.data.queryString}` : '',
      `Status: ${this.data.statusCode ?? '-'}`,
      `Duration: ${this.data.durationMs ?? '-'} ms`,
      `IP: ${this.data.ipAddress ?? '-'}`,
      '',
      'Payload:',
      this.prettyPayload || '(none)'
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
