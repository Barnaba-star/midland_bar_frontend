import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export interface StaffCodeIssuedData {
  name: string;
  staffCode: string;
  issuedPin: string;
}

/**
 * A new staff member was added without a code or PIN: the system chose both,
 * and this is the only time the PIN is shown. The manager hands them over;
 * the staff member signs in once with them and then picks their own.
 */
@Component({
  selector: 'app-staff-code-issued-dialog',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './staff-code-issued-dialog.html',
  styleUrl: './staff-code-issued-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffCodeIssuedDialog {
  copied = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: StaffCodeIssuedData,
    private dialogRef: MatDialogRef<StaffCodeIssuedDialog>,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  copy(): void {
    const text = this.translate.instant('STAFF_ISSUED.COPY_TEXT', {
      name: this.data.name,
      code: this.data.staffCode,
      pin: this.data.issuedPin,
    });
    // Refused on an insecure origin and in some browsers; both are on
    // screen either way, so a failure is not worth an error.
    navigator.clipboard?.writeText(text).then(
      () => {
        this.copied = true;
        this.cdr.markForCheck();
      },
      () => {},
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
