import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Search input for server-side searching. Every keystroke would otherwise be
 * its own request, so what leaves here is debounced and de-duplicated - the
 * parent just reloads its page whenever `searchChange` fires.
 */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBoxComponent implements OnInit, OnDestroy {

  /** Translation key for the placeholder. */
  @Input() placeholder = 'COMMON.SEARCH';

  /** Long enough to outrun typing, short enough not to feel laggy. */
  @Input() debounceMs = 350;

  @Output() searchChange = new EventEmitter<string>();

  searchText = '';

  private readonly typed$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.typed$
      .pipe(
        debounceTime(this.debounceMs),
        // Backspacing to the same term should not refetch.
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.searchChange.emit(term);
        this.cdr.markForCheck();
      });
  }

  onInputChange(): void {
    this.typed$.next(this.searchText.trim());
  }

  clear(): void {
    if (!this.searchText) {
      return;
    }
    this.searchText = '';
    // Clearing is deliberate, so it goes straight out without the debounce.
    this.typed$.next('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
