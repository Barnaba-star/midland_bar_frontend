import { UnitLabelPipe } from '../../../pipes/stock-packs.pipe';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-service-details-dialog-component',
  imports: [MatIconModule, DecimalPipe, TranslatePipe, UnitLabelPipe],
  templateUrl: './service-details-dialog-component.html',
  styleUrl: './service-details-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServiceDetailsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public service: any,
    private dialogRef: MatDialogRef<ServiceDetailsDialogComponent>,
  ) { }

  close(): void {
    this.dialogRef.close();
  }
}
