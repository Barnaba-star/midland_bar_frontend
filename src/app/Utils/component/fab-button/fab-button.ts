import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-fab-button',
    imports: [MatTooltipModule, MatIconModule],
    templateUrl: './fab-button.html',
    styleUrl: './fab-button.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FabButtonComponent {
  @Input() icon: string = '';
  @Input() tooltip: string = '';
  @Output() action = new EventEmitter<void>();

  onClick() {
    this.action.emit();
  }
}
