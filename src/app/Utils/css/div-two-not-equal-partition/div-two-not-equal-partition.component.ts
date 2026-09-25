import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-div-two-not-equal-partition',
  imports: [CommonModule],
  templateUrl: './div-two-not-equal-partition.component.html',
  styleUrl: './div-two-not-equal-partition.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DivTwoNotEqualPartitionComponent {
  @Input() title: string = '';
}
