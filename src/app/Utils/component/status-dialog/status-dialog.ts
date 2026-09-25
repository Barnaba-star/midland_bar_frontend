import { CommonModule } from '@angular/common';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';


export interface StatusDialogData {
  status: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  showClose?: boolean;
}

@Component({
    selector: 'app-status-dialog',
    templateUrl: './status-dialog.html',
    imports: [MatIconModule, MatDialogModule, CommonModule, TranslatePipe],
    styleUrls: ['./status-dialog.css'],
    host: {
        '[class.error-dialog]': 'data.status === "error"' // 👈 hapa
    },
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<StatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StatusDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  get statusKey(): string {
    return 'COMMON.' + this.data.status.toUpperCase();
  }

 get icon(): string {
  switch (this.data.status) {
    case 'success': return 'success';   // success.svg
    case 'error': return 'error';       // error.svg
    case 'warning': return 'warning';   // warning.svg
    case 'info': return 'info';         // info.svg
    default: return 'info';
  }
}


  get color(): string {
    switch (this.data.status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'gray';
    }
  }
}
