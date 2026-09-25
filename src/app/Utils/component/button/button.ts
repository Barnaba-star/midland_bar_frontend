import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-button',
    templateUrl: './button.html',
    imports: [MatButtonModule, MatIconModule, CommonModule],
    styleUrls: ['./button.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() label: string = 'Click';
  @Input() icon: string = ''; 
  @Input() color: string = 'primary'; 
  @Input() type: string = 'button';
  @Input() disabled: boolean = false;
  @Input() active: boolean = false;
  @Output() clicked = new EventEmitter<void>();

  handleClick() {
    this.clicked.emit();
  }

  isMaterialColor(color: string): boolean {
    return ['primary', 'accent', 'warn'].includes(color);
  }
}
