import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { StockTake } from './stock-take';

/**
 * The stock count on a page of its own (POS > Hesabu Stock), for whoever
 * may correct the store - the store keeper included, who has no Reports.
 * The same count also stays inside Reports.
 */
@Component({
  selector: 'app-stock-take-page',
  imports: [Title2, StockTake],
  template: `
    <app-title2 titleHeader="MENU.STOCK_COUNT" [actions]="[]"></app-title2>
    <div class="page"><app-stock-take area="bar" /></div>
  `,
  styles: [`
    :host { display: block; }
    .page { margin: 20px 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTakePage {}
