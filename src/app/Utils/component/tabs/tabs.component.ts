import { Component, Input, Output, EventEmitter, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { IconRegistryService } from '../../services/icon-registry.service';



@Component({
    selector: 'app-tabs',
    imports: [MatTabsModule, CommonModule, FormsModule, MatIconModule],
    templateUrl: './tabs.component.html',
    styleUrls: ['./tabs.component.css'],
    encapsulation: ViewEncapsulation.None, // ← Ongeza hii line
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsComponent {
constructor(private iconRegistry: IconRegistryService){}
  @Input() tabs: any[] = [];
  @Output() selectedIndexChange = new EventEmitter<number>();
}
