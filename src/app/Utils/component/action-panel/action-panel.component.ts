import {
  Component,
  ContentChild,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';

@Component({
  selector: 'app-action-panel',
  template: `
    <div class="projected-data">
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./action-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActionPanelComponent implements AfterViewInit {
  @ContentChild('clickableParagraph') paragraphRef!: ElementRef;
  @Output() clicked = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (this.paragraphRef) {
      this.paragraphRef.nativeElement.style.cursor = 'pointer';
      this.paragraphRef.nativeElement.addEventListener('click', () => {
        this.clicked.emit();
      });
    }
  }
}
