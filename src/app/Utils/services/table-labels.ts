import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';

/**
 * On a phone every table row is shown as a card, one "label: value" line per
 * cell (see the PHONES section of styles.css). CSS cannot read a column's
 * heading from inside a cell, so this copies each <th>'s text onto the cells
 * under it as data-label, and keeps doing so as tables render and page.
 *
 * Desktop never reads the attribute, so it costs nothing there.
 */
@Injectable({ providedIn: 'root' })
export class TableLabelsService {
  private document = inject(DOCUMENT);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private queued = false;

  start(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // Outside Angular: labelling cells must not trigger change detection.
    this.zone.runOutsideAngular(() => {
      new MutationObserver(() => this.queue()).observe(this.document.body, { childList: true, subtree: true });
      this.queue();
    });
  }

  private queue(): void {
    if (this.queued) {
      return;
    }
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.document.querySelectorAll<HTMLTableElement>('table').forEach((table) => this.label(table));
    });
  }

  private label(table: HTMLTableElement): void {
    const headRow = table.tHead?.rows[table.tHead.rows.length - 1];
    if (!headRow) {
      return;
    }
    // Column index -> heading, honouring colspan.
    const headings: string[] = [];
    for (const th of Array.from(headRow.cells)) {
      const text = (th.textContent ?? '').replace(/\s+/g, ' ').trim();
      for (let i = 0; i < th.colSpan; i++) {
        headings.push(text);
      }
    }
    for (const body of Array.from(table.tBodies)) {
      for (const row of Array.from(body.rows)) {
        let column = 0;
        for (const cell of Array.from(row.cells)) {
          const heading = cell.colSpan > 1 ? '' : headings[column] ?? '';
          if (cell.getAttribute('data-label') !== heading) {
            cell.setAttribute('data-label', heading);
          }
          column += cell.colSpan;
        }
      }
    }
  }
}
