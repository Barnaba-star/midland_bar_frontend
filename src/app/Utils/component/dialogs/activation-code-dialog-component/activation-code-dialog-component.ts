import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface ActivationCodeDialogData {
  username: string;
  activationCode: string;
  validHours: number;
  /** Where the text was sent, shown so it is obvious which phone to check. */
  phone?: string;
}

/**
 * Shown once, to whoever just registered someone.
 *
 * The person being registered is usually standing right there, so reading
 * the code out to them beats waiting for a text - and it is the only way
 * this works at all until the SMS provider is wired in. It is shown here
 * and nowhere else: the code is stored hashed and cannot be read back.
 */
@Component({
  selector: 'app-activation-code-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './activation-code-dialog-component.html',
  styleUrl: './activation-code-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivationCodeDialogComponent {

  copied = false;

  constructor(
    private dialogRef: MatDialogRef<ActivationCodeDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: ActivationCodeDialogData,
  ) { }

  copy(): void {
    const text = `${this.data.username} / ${this.data.activationCode}`;
    // Clipboard access is refused on an insecure origin and in some
    // browsers; the code is on screen either way, so a failure here is
    // not worth an error.
    navigator.clipboard?.writeText(text).then(
      () => {
        this.copied = true;
        this.cdr.markForCheck();
      },
      () => { },
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
