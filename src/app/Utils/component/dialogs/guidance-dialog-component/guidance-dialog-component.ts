import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminService, Guidance } from '../../../../admin/admin-service';

export interface GuidanceDialogData {
  guidance?: Guidance;
}

/**
 * Writing a note for the branches.
 *
 * The file is attached in a second call, after the note exists: a form
 * posting JSON cannot carry a file, and making every wording change
 * re-upload one would be worse than two round trips.
 */
@Component({
  selector: 'app-guidance-dialog-component',
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './guidance-dialog-component.html',
  styleUrl: './guidance-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceDialogComponent {

  /** What may be attached - the same list the backend enforces. */
  private static readonly ALLOWED_TYPES =
    ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

  private static readonly MAX_SIZE_BYTES = 10 * 1024 * 1024;

  isEdit = false;

  uid = '';
  title = '';
  body = '';
  videoUrl = '';
  published = false;
  position = 0;

  fileName: string | null = null;
  pendingFile: File | null = null;

  saving = false;
  errorMessage: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<GuidanceDialogComponent>,
    private adminService: AdminService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) data: GuidanceDialogData | null,
  ) {
    const guidance = data?.guidance;
    if (guidance) {
      this.isEdit = true;
      this.uid = guidance.uid;
      this.title = guidance.title ?? '';
      this.body = guidance.body ?? '';
      this.videoUrl = guidance.videoUrl ?? '';
      this.published = guidance.published;
      this.position = guidance.position ?? 0;
      this.fileName = guidance.fileName;
    }
  }

  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.errorMessage = null;

    if (!GuidanceDialogComponent.ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage = this.translate.instant('GUIDANCE_DIALOG.BAD_TYPE');
      input.value = '';
      return;
    }
    if (file.size > GuidanceDialogComponent.MAX_SIZE_BYTES) {
      // Said here rather than after the upload fails, which on a slow
      // connection is a long wait for a no.
      this.errorMessage = this.translate.instant('GUIDANCE_DIALOG.TOO_BIG');
      input.value = '';
      return;
    }

    this.pendingFile = file;
    this.fileName = file.name;
    this.cdr.markForCheck();
  }

  get canSave(): boolean {
    return !this.saving && this.title.trim().length > 0;
  }

  save(): void {

    if (!this.canSave) {
      return;
    }

    this.saving = true;
    this.errorMessage = null;

    this.adminService.saveGuidance({
      uid: this.uid || undefined,
      title: this.title.trim(),
      body: this.body.trim() || null,
      videoUrl: this.videoUrl.trim() || null,
      published: this.published,
      position: Number(this.position) || 0,
    }).subscribe({

      next: (res) => {
        if (!res?.data) {
          this.saving = false;
          this.errorMessage = this.codeMessage(res?.message);
          this.cdr.markForCheck();
          return;
        }
        if (this.pendingFile) {
          this.upload(res.data);
        } else {
          this.saving = false;
          this.dialogRef.close(res.data);
        }
      },

      error: () => {
        this.saving = false;
        this.errorMessage = this.translate.instant('GUIDANCE_DIALOG.SAVE_FAILED');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * The note is already saved by this point, so a failed upload loses the
   * file and nothing else - which is why it says so rather than closing.
   */
  private upload(saved: Guidance): void {

    this.adminService.attachFile(saved.uid, this.pendingFile as File).subscribe({

      next: (res) => {
        this.saving = false;
        if (res?.data) {
          this.dialogRef.close(res.data);
        } else {
          this.errorMessage = this.codeMessage(res?.message);
          this.cdr.markForCheck();
        }
      },

      error: () => {
        this.saving = false;
        this.errorMessage = this.translate.instant('GUIDANCE_DIALOG.UPLOAD_FAILED');
        this.cdr.markForCheck();
      },
    });
  }

  private codeMessage(code: string | undefined): string {
    const known: Record<string, string> = {
      NO_TITLE: 'GUIDANCE_DIALOG.NO_TITLE',
      NOT_FOUND: 'GUIDANCE_DIALOG.NOT_FOUND',
      NO_FILE: 'GUIDANCE_DIALOG.NO_FILE',
      BAD_TYPE: 'GUIDANCE_DIALOG.BAD_TYPE',
      STORE_FAILED: 'GUIDANCE_DIALOG.UPLOAD_FAILED',
    };
    return this.translate.instant(known[code ?? ''] ?? 'GUIDANCE_DIALOG.SAVE_FAILED');
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
