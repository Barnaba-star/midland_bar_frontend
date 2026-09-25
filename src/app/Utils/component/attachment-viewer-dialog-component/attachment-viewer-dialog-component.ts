import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { SafeUrlPipe } from "../../pipes/safe-url-pipe";

@Component({
  selector: 'app-attachment-viewer-dialog-component',
  imports: [MatDialogContent, MatDialogModule, SafeUrlPipe],
  templateUrl: './attachment-viewer-dialog-component.html',
  styleUrl: './attachment-viewer-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentViewerDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { url: string }) {}
}    