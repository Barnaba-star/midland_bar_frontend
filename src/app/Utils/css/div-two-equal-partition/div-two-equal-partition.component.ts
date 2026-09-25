import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-div-two-equal-partition',
  imports: [CommonModule],
  templateUrl: './div-two-equal-partition.component.html',
  styleUrl: './div-two-equal-partition.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DivTwoEqualPartitionComponent {
}
