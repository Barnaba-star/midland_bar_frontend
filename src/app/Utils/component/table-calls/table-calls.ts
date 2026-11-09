import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { environment } from '../../enviroments/environment';
import { silent } from '../../inteceptor/silent-request';
import { LiveChanges } from '../../services/live-changes';

interface TableCall { uid: string; tableName: string; kind: 'WAITER' | 'BILL'; calledAt: string; }

/**
 * Tables calling from the customers' window (owner, 2026-11-09): "Meza 5
 * inaita mhudumu" / "Meza 5 inaomba bill", with a chime for each new one.
 * Shown over POS and the counter screen; whoever goes taps "Nimeenda".
 */
@Component({
  selector: 'app-table-calls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (calls().length) {
      <aside class="tc" role="status" aria-live="polite">
        @for (c of calls(); track c.uid) {
          <div class="tc-item" [class.bill]="c.kind === 'BILL'">
            <span class="tc-ico" aria-hidden="true">{{ c.kind === 'BILL' ? '🧾' : '🙋' }}</span>
            <div class="tc-text">
              <strong>{{ c.tableName }}</strong>
              <span>{{ c.kind === 'BILL' ? 'inaomba bill' : 'inaita mhudumu' }} · {{ ago(c.calledAt) }}</span>
            </div>
            <button type="button" (click)="done(c)">Nimeenda</button>
          </div>
        }
      </aside>
    }
  `,
  styles: [`
    .tc { position: fixed; right: 16px; bottom: 16px; z-index: 1200; display: flex; flex-direction: column; gap: 8px; width: min(340px, calc(100vw - 32px)); }
    .tc-item { display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 14px; border-radius: 14px; background: #f5a524; color: #1a1206; box-shadow: 0 10px 30px rgba(0,0,0,.35); animation: tc-in .25s ease-out; }
    .tc-item.bill { background: #2b2118; color: #f6ecdc; border: 2px solid #f5a524; }
    .tc-ico { font-size: 22px; }
    .tc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .tc-text strong { font-size: 16px; }
    .tc-text span { font-size: 13px; opacity: .85; }
    .tc-item button { flex: none; height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: #1a1206; color: #f6ecdc; font: inherit; font-weight: 700; cursor: pointer; }
    .tc-item.bill button { background: #f5a524; color: #1a1206; }
    @keyframes tc-in { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `],
})
export class TableCalls {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.baseApiUrl}/bar/tables/calls`;
  readonly calls = signal<TableCall[]>([]);
  private known = new Set<string>();
  private first = true;
  private audio: AudioContext | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.load();
    interval(20_000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.load());
    inject(LiveChanges).on('calls').pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.load());
  }

  private load(): void {
    this.http.get<{ data?: TableCall[] }>(this.url, { context: silent() }).subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        const fresh = list.some((c) => !this.known.has(c.uid));
        this.known = new Set(list.map((c) => c.uid));
        if (fresh && !this.first) this.chime();
        this.first = false;
        this.calls.set(list);
      },
      error: () => {},
    });
  }

  done(c: TableCall): void {
    this.calls.set(this.calls().filter((x) => x.uid !== c.uid));
    this.http.post(`${this.url}/${c.uid}/done`, {}, { context: silent() }).subscribe({ error: () => this.load() });
  }

  ago(at: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    return mins < 1 ? 'sasa hivi' : `dk ${mins}`;
  }

  /** Two short tones - can't be missed at a busy counter. */
  private chime(): void {
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      [0, 0.22].forEach((t, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = i ? 990 : 740;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.22);
      });
    } catch { /* no sound on this device */ }
  }
}
