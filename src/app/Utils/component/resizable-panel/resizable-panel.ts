import { Component, ContentChildren, QueryList, TemplateRef, AfterContentInit, Input, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-resizable-panel',
    imports: [CommonModule],
    templateUrl: './resizable-panel.html',
    styleUrls: ['./resizable-panel.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResizablePanel {
   @ContentChildren(TemplateRef) items!: QueryList<TemplateRef<any>>;
  projectedItems: TemplateRef<any>[] = [];
  activePanels: number[] = [];
  panelHeights: { [key: number]: number } = {};
  layoutDirections: ('row' | 'column')[] = [];


  ngAfterContentInit() {
    this.projectedItems = this.items.toArray();
    if (this.projectedItems.length > 0) {
      this.activePanels = [0]; 
    }
  }

  togglePanel(index: number) {
    if (this.activePanels.includes(index)) {
      this.activePanels = this.activePanels.filter(i => i !== index);
      if (this.activePanels.length === 0 && this.projectedItems.length > 0) {
        this.activePanels = [0];
      }
    } else {
      this.activePanels.push(index);
    }
  }

  setPanelHeight(index: number, height: number) {
  this.panelHeights[index] = height;
}

setPanelDirection(index: number, direction: 'row' | 'column') {
  this.layoutDirections[index] = direction;
}
}