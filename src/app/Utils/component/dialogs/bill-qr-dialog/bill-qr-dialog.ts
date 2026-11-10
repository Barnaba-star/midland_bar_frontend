import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';
import { environment } from '../../../enviroments/environment';

/** The link a bill's QR opens: the customers' window for that bill only. */
export function billLink(token: string): string {
  return `${location.origin}/meza/${token}`;
}

/** A QR as an image, for screens and printed bills. */
export function billQrImage(token: string, width = 480): Promise<string> {
  return QRCode.toDataURL(billLink(token), { margin: 1, width, errorCorrectionLevel: 'M' });
}

/**
 * A bill's own QR (owner, 2026-11-10), on the waiter's screen: the customer
 * scans it to see the bill and order more onto it - straight to this waiter.
 */
@Component({
  selector: 'app-bill-qr-dialog',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bq">
      <h2>Bill {{ code() || data.code }}</h2>
      @if (img()) {
        <img [src]="img()" alt="QR ya bill" />
        <p>Mteja ascan QR hii kuona bill yake na kuagiza zaidi - oda inakuja kwako moja kwa moja.</p>
      } @else if (error()) {
        <p class="err">{{ error() }}</p>
      } @else {
        <p>Inaandaa QR…</p>
      }
      <div class="row">
        @if (img()) { <button type="button" class="print" (click)="print()"><mat-icon>print</mat-icon>Chapisha</button> }
        <button type="button" (click)="ref.close()">Funga</button>
      </div>
    </div>
  `,
  styles: [`
    .bq { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
    h2 { margin: 0; font-size: 26px; }
    img { width: min(300px, 70vw); height: auto; background: #fff; padding: 10px; border-radius: 12px; }
    p { margin: 0; color: var(--color-text-muted); max-width: 320px; }
    .err { color: #c03535; font-weight: 700; }
    .row { display: flex; gap: 8px; }
    button { display: inline-flex; align-items: center; gap: 6px; height: 42px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font: inherit; font-weight: 700; cursor: pointer; }
    .print { background: var(--color-accent); border-color: var(--color-accent); color: #1a1206; }
  `],
})
export class BillQrDialog {
  readonly data = inject<{ billUid: string; code?: string }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<BillQrDialog>);
  readonly img = signal('');
  readonly code = signal('');
  readonly error = signal('');

  constructor() {
    inject(HttpClient).get<{ data?: { token: string; code: string }; message?: string }>(
      `${environment.baseApiUrl}/bar/tables/billQr/${this.data.billUid}`).subscribe({
      next: (res) => {
        if (!res?.data) { this.error.set(res?.message || 'QR haikupatikana'); return; }
        this.code.set(res.data.code);
        billQrImage(res.data.token).then((src) => this.img.set(src));
      },
      error: (e) => this.error.set(e?.error?.message || 'QR haikupatikana'),
    });
  }

  /** A small slip for the receipt printer: the bill number and its QR. */
  print(): void {
    const w = window.open('', '_blank', 'width=320,height=480');
    if (!w) return;
    w.document.write(`<html><head><title>Bill ${this.code()}</title><style>
      body{font-family:sans-serif;text-align:center;margin:0;padding:8px;width:58mm}
      h1{font-size:18px;margin:4px 0}img{width:46mm;height:46mm}p{font-size:11px;margin:4px 0}
    </style></head><body><h1>Bill ${this.code()}</h1><img src="${this.img()}"/>
      <p>Scan kuona bill yako na kuagiza zaidi</p></body></html>`);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* closed */ } }, 600);
  }
}
