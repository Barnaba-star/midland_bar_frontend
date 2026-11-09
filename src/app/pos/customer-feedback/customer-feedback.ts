import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../Utils/enviroments/environment';

interface Feedback {
  uid: string; tableName?: string; kind: string; message: string; rating?: number | null;
  customerName?: string | null; customerPhone?: string | null; sentAt: string; readAt?: string | null;
}

const KIND: Record<string, string> = { PRAISE: 'Pongezi', COMPLAINT: 'Malalamiko', QUESTION: 'Swali', ADVICE: 'Ushauri' };

/** POS Setting > Maoni ya Wateja: what customers wrote from the tables' QR window (CEO / manager). */
@Component({
  selector: 'app-customer-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule],
  template: `
    <div class="cf">
      <header class="cf-head">
        <div>
          <h3>Maoni ya Wateja</h3>
          <p>Wateja wanaandika kutoka dirisha la meza (QR). Malalamiko na nyota 1–2 yanakufikia pia kwa SMS.</p>
        </div>
        <div class="cf-filters">
          @for (f of filters; track f.key) {
            <button type="button" [class.on]="filter() === f.key" (click)="load(f.key)">{{ f.label }}</button>
          }
        </div>
      </header>
      @if (!items().length && loaded()) {
        <p class="cf-empty">Hakuna maoni kwa kipindi hiki.</p>
      }
      <div class="cf-list">
        @for (f of items(); track f.uid) {
          <article class="cf-item" [class.unread]="!f.readAt" [class.bad]="f.kind === 'COMPLAINT'">
            <div class="cf-top">
              <span class="cf-kind">{{ kind(f.kind) }}</span>
              @if (f.rating) { <span class="cf-stars" [attr.aria-label]="f.rating + ' nyota'">{{ stars(f.rating) }}</span> }
              <span class="cf-meta">{{ f.tableName }} · {{ f.sentAt | date: 'dd/MM HH:mm' }}</span>
            </div>
            <p class="cf-msg">{{ f.message }}</p>
            @if (f.customerName || f.customerPhone) {
              <p class="cf-who"><mat-icon>person</mat-icon>{{ f.customerName }} @if (f.customerPhone) { · <a [href]="'tel:' + f.customerPhone">{{ f.customerPhone }}</a> }</p>
            }
            @if (!f.readAt) {
              <button type="button" class="cf-read" (click)="read(f)"><mat-icon>done</mat-icon>Nimesoma</button>
            }
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    .cf { padding: 16px; }
    .cf-head { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; justify-content: space-between; padding: 18px; border-radius: 16px; background: var(--color-surface, #fbf6ec); border: 1px solid var(--color-border, #e6dccb); }
    .cf-head h3 { margin: 0; font-size: 20px; }
    .cf-head p { margin: 4px 0 0; color: var(--color-text-muted, #7a6f60); }
    .cf-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .cf-filters button { height: 36px; padding: 0 14px; border: 1px solid var(--color-border, #d8cdb9); border-radius: 999px; background: transparent; color: var(--color-text); font: inherit; font-weight: 600; cursor: pointer; }
    .cf-filters button.on { background: var(--color-accent, #f5a524); border-color: var(--color-accent, #f5a524); color: #1a1206; }
    .cf-empty { margin: 24px 4px; color: var(--color-text-muted, #7a6f60); }
    .cf-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
    .cf-item { padding: 14px 16px; border-radius: 14px; background: var(--color-surface, #fbf6ec); border: 1px solid var(--color-border, #e6dccb); }
    .cf-item.unread { border-left: 5px solid var(--color-accent, #f5a524); }
    .cf-item.bad.unread { border-left-color: #c0392b; }
    .cf-top { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .cf-kind { padding: 2px 10px; border-radius: 999px; background: rgba(245,165,36,.18); color: var(--color-accent-dark, #b86e00); font-size: 12px; font-weight: 800; }
    .cf-item.bad .cf-kind { background: rgba(192,57,43,.14); color: #c0392b; }
    .cf-stars { color: #f5a524; letter-spacing: 1px; }
    .cf-meta { margin-left: auto; color: var(--color-text-muted, #7a6f60); font-size: 12px; }
    .cf-msg { margin: 8px 0 0; white-space: pre-wrap; text-transform: none; }
    .cf-who { display: flex; align-items: center; gap: 4px; margin: 6px 0 0; color: var(--color-text-muted, #7a6f60); font-size: 13px; }
    .cf-who mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .cf-read { display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; height: 34px; padding: 0 14px; border: 1px solid var(--color-border, #d8cdb9); border-radius: 999px; background: transparent; color: var(--color-text); font: inherit; font-weight: 700; cursor: pointer; }
    .cf-read mat-icon { width: 16px; height: 16px; font-size: 16px; }
  `],
})
export class CustomerFeedback {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseApiUrl}/bar/tables/feedback`;
  readonly items = signal<Feedback[]>([]);
  readonly loaded = signal(false);
  readonly filter = signal('WEEK');
  readonly filters = [
    { key: 'TODAY', label: 'Leo' },
    { key: 'WEEK', label: 'Wiki' },
    { key: 'MONTH', label: 'Mwezi' },
    { key: 'YEAR', label: 'Mwaka' },
  ];

  constructor() {
    this.load('WEEK');
  }

  load(f: string): void {
    this.filter.set(f);
    this.http.get<{ data?: Feedback[] }>(`${this.url}/${f}`).subscribe({
      next: (res) => { this.items.set(res?.data ?? []); this.loaded.set(true); },
      error: () => this.loaded.set(true),
    });
  }

  read(f: Feedback): void {
    this.http.post<{ data?: Feedback }>(`${this.url}/${f.uid}/read`, {}).subscribe((res) => {
      if (res?.data) this.items.set(this.items().map((x) => (x.uid === f.uid ? res.data! : x)));
    });
  }

  kind(k: string): string { return KIND[k] ?? k; }
  stars(n: number): string { return '★'.repeat(n) + '☆'.repeat(5 - n); }
}
