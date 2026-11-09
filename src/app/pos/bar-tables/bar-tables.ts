import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';
import { environment } from '../../Utils/enviroments/environment';
import { AlertService } from '../../Utils/services/alert';
import { silent } from '../../Utils/inteceptor/silent-request';

interface BarTable { uid: string; number: number; name: string; token: string; }

/**
 * POS Setting > Meza & QR (owner, 2026-11-09): how many tables this branch
 * has, and their QR cards to print and stand on the tables. A card is a link
 * to the customers' window (/meza/<token>); "Kadi mpya" gives a table a new
 * token so a lost or copied card stops working.
 */
@Component({
  selector: 'app-bar-tables',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  templateUrl: './bar-tables.html',
  styleUrl: './bar-tables.css',
})
export class BarTables {
  private readonly http = inject(HttpClient);
  private readonly alerts = inject(AlertService);
  private readonly url = `${environment.baseApiUrl}/bar/tables`;

  readonly tables = signal<BarTable[]>([]);
  readonly qr = signal<Record<string, string>>({});
  readonly branchName = signal('');
  readonly busy = signal(false);
  readonly loaded = signal(false);
  count = 0;
  /** A step that needs a second tap: fewer tables, or a new card for one table. */
  readonly confirming = signal<string | null>(null);
  editing: string | null = null;
  editName = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<{ data?: BarTable[] }>(this.url).subscribe({
      next: (res) => this.show(res.data ?? []),
      error: () => this.loaded.set(true),
    });
  }

  /** The address a card opens - this site's own, so it works on any domain it is served from. */
  link(t: BarTable): string {
    return `${location.origin}/meza/${t.token}`;
  }

  private show(list: BarTable[]): void {
    this.tables.set(list);
    this.count = list.length;
    this.loaded.set(true);
    this.confirming.set(null);
    Promise.all(list.map((t) => QRCode.toDataURL(this.link(t), { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then((src) => [t.uid, src] as const)))
      .then((pairs) => this.qr.set(Object.fromEntries(pairs)));
    // The branch name for the cards - the customers' window already says it.
    if (list.length && !this.branchName()) {
      this.http.get<{ data?: { branchName?: string } }>(`${environment.baseApiUrl}/public/table/${list[0].token}`, { context: silent() })
        .subscribe((res) => this.branchName.set(res?.data?.branchName ?? ''));
    }
  }

  saveCount(): void {
    const n = Math.floor(Number(this.count));
    if (!Number.isFinite(n) || n < 0 || n > 300) {
      this.alerts.show('error', 'Weka idadi ya meza kati ya 0 na 300');
      return;
    }
    if (n < this.tables().length && this.confirming() !== 'COUNT') {
      this.confirming.set('COUNT');
      return;
    }
    this.busy.set(true);
    this.http.post<{ data?: BarTable[]; message?: string }>(`${this.url}/count`, { count: n }).subscribe({
      next: (res) => {
        this.busy.set(false);
        if (res?.data) {
          this.show(res.data);
          this.alerts.show('success', `Meza ${res.data.length} zimehifadhiwa`);
        } else if (res?.message) {
          this.alerts.show('error', res.message);
        }
      },
      error: () => this.busy.set(false),
    });
  }

  startRename(t: BarTable): void {
    this.editing = t.uid;
    this.editName = t.name;
  }

  saveName(t: BarTable): void {
    const name = this.editName.trim();
    if (!name || name === t.name) {
      this.editing = null;
      return;
    }
    this.http.post<{ data?: BarTable; message?: string }>(`${this.url}/${t.uid}/rename`, { name }).subscribe((res) => {
      this.editing = null;
      if (res?.data) {
        this.tables.set(this.tables().map((x) => (x.uid === t.uid ? res.data! : x)));
      } else if (res?.message) {
        this.alerts.show('error', res.message);
      }
    });
  }

  newCard(t: BarTable): void {
    if (this.confirming() !== t.uid) {
      this.confirming.set(t.uid);
      return;
    }
    this.http.post<{ data?: BarTable; message?: string }>(`${this.url}/${t.uid}/newCard`, {}).subscribe((res) => {
      if (res?.data) {
        this.show(this.tables().map((x) => (x.uid === t.uid ? res.data! : x)));
        this.alerts.show('success', `${t.name}: kadi mpya - chapisha na uweke mezani`);
      } else if (res?.message) {
        this.alerts.show('error', res.message);
      }
    });
  }

  /** Print the cards (all, or one table's): four to an A4 page, cut along the dashed lines. */
  print(only?: BarTable): void {
    const list = only ? [only] : this.tables();
    if (!list.length) {
      return;
    }
    Promise.all(list.map((t) => QRCode.toDataURL(this.link(t), { margin: 1, width: 600, errorCorrectionLevel: 'M' })))
      .then((codes) => this.printCards(list, codes));
  }

  private printCards(list: BarTable[], codes: string[]): void {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const logo = `${location.origin}/assets/images/baronix-b-dark.png`;
    const branch = esc(this.branchName());
    const cards = list.map((t, i) => `
      <div class="card">
        <div class="head"><img class="logo" src="${logo}" alt=""><span>BaronixTZ</span></div>
        <div class="scan">Scan kuona menyu</div>
        <img class="qr" src="${codes[i]}" alt="">
        <div class="table">${esc(t.name)}</div>
        ${branch ? `<div class="branch">${branch}</div>` : ''}
        <div class="hint">Fungua camera ya simu, elekeza kwenye QR</div>
      </div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>QR za meza</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1a1206; }
        .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .card { height: 138mm; padding: 8mm 6mm; border: 1px dashed #b9ad9a; text-align: center;
                display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; }
        .head { display: flex; align-items: center; gap: 2mm; font-weight: 800; font-size: 15pt; }
        .logo { height: 11mm; }
        .scan { margin-top: 3mm; font-size: 13pt; font-weight: 700; color: #b86e00; text-transform: uppercase; letter-spacing: .06em; }
        .qr { width: 62mm; height: 62mm; margin: 4mm 0; }
        .table { font-size: 26pt; font-weight: 800; }
        .branch { margin-top: 1mm; font-size: 11pt; color: #5c5246; }
        .hint { margin-top: 3mm; font-size: 9pt; color: #7a6f60; }
      </style></head><body><div class="sheet">${cards}</div></body></html>`;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    const imgs = Array.from(doc.images);
    Promise.all(imgs.map((img) => img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); })))
      .then(() => {
        frame.contentWindow!.focus();
        frame.contentWindow!.print();
        setTimeout(() => frame.remove(), 60_000);
      });
  }
}
