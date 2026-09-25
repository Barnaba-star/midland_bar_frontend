import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.html',
    styleUrls: ['./file-upload.css'],
    imports: [MatIcon, MatTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploadComponent {

  @Input() accept: string = '.pdf,.doc,.docx'; // allowed file types, default
  @Input() icon: string = 'attachment'; // default icon
  @Input() tooltip: string = 'Add Attachment'; // default tooltip

  @Output() fileSelected = new EventEmitter<File>();

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileSelected.emit(input.files[0]);
    }
  }
}
