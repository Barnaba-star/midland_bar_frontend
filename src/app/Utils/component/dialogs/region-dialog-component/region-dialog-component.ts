import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Region } from '../../../../settings/region-setting/region-service';

/** The region being edited, or nothing at all when one is being added. */
export type RegionDialogData = Region | null;

/**
 * Adds a region or edits one. Closes with the region when it is saved, and
 * with nothing when it is not - the uid is what tells the backend which of
 * the two it is being asked to do.
 */
@Component({
  selector: 'app-region-dialog-component',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, TranslatePipe],
  templateUrl: './region-dialog-component.html',
  styleUrl: './region-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionDialogComponent {

  name = '';
  code = '';

  /** An existing region keeps its uid so the save edits rather than creates. */
  private readonly uid?: string;

  readonly isEdit: boolean;

  constructor(
    public dialogRef: MatDialogRef<RegionDialogComponent>,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: RegionDialogData
  ) {
    this.uid = data?.uid;
    this.isEdit = !!data?.uid;
    this.name = data?.name ?? '';
    this.code = data?.code ?? '';
  }

  /** Zoneless change detection does not watch the model on its own. */
  onFieldChange(): void {
    this.cdr.markForCheck();
  }

  get isValid(): boolean {
    return this.name.trim().length > 0 && this.code.trim().length > 0;
  }

  confirm(): void {
    if (!this.isValid) {
      return;
    }
    // The field only looks uppercase on screen; what is sent is made so here.
    this.dialogRef.close({
      uid: this.uid,
      name: this.name.trim(),
      code: this.code.trim().toUpperCase()
    } as Region);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
