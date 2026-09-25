import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatIcon, MatIconModule } from "@angular/material/icon";
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-delete-dialog',
    imports: [CommonModule, MatIconModule, TranslatePipe],
    templateUrl: './delete-dialog.html',
    styleUrls: ['./delete-dialog.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteDialogComponent {
  @Input() message: string = 'Are you sure you want to delete this item?';
  @Input() icon?: string;
  @Input() data: any;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
assets: any;
delete: any;

onConfirm(): void {
  this.confirm.emit();
}

  onCancel() {
    this.cancel.emit();
  }
}
