import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The "nothing here yet" block, in one place.
 *
 * Every POS page had written its own, which is how they drifted: some stood
 * the icon above the words and some beside them, and the headings had grown
 * to nearly the size of the page title - so an empty table shouted louder
 * than the screen it sat in. This is deliberately quiet: one arrangement,
 * icon on top, and text a step below the side nav rather than above it.
 *
 * `title` and `text` are translation keys. Anything projected in - an "Add"
 * button, usually - sits under the words and keeps the styling of the page
 * that declared it.
 */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {

  /** Name of a registered svg icon - see IconRegistryService. */
  @Input({ required: true }) icon!: string;

  @Input({ required: true }) title!: string;

  @Input() text?: string;

  /**
   * For a "no data" note inside a chart card rather than a whole page. Same
   * arrangement, smaller - a full-size block would push the card open.
   */
  @Input({ transform: booleanAttribute }) compact = false;
}
