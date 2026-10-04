import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { SystemSettingService } from '../../../services/system-setting';
import { UploadedImageService } from '../../../services/uploaded-image';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';

/**
 * A bill's receipt, laid out for a narrow receipt printer. Print opens it
 * alone in a small window so the rest of the app does not print with it.
 *
 * Given several bills (a staff member handing in their money), it shows a
 * summary - whose bills, how many, each one's total and the sum - then every
 * bill, and prints them in one job: the summary first, each bill on its own
 * page.
 */
@Component({
  selector: 'app-receipt-dialog-component',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './receipt-dialog-component.html',
  styleUrl: './receipt-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptDialogComponent implements OnInit {
  /** Receipt printer roll width - the Bar's printers take 58mm rolls (80mm is the other common size). */
  static readonly PAPER_MM = 58;
  /** Side margin on the slip - the receipt fills the roll's width, edge to edge but for this. */
  static readonly SIDE_MM = 2;
  /** The branch-name watermark: how faint (thermal printers dither grey into dots), and how many times it repeats. */
  static readonly WATERMARK_OPACITY = 0.07;
  static readonly WATERMARK_REPEAT = 40;

  @ViewChild('papers') papers?: ElementRef<HTMLElement>;

  receipts: any[] = [];
  /** The branch's logo, printed at the top of the slip (none if it has none, or offline). */
  logoUrl: string | null = null;
  loading = true;

  constructor(
    /** autoPrint: print as soon as the bill is in, then close - nothing to look at or click. */
    @Inject(MAT_DIALOG_DATA) public data: { billUid?: string; billUids?: string[]; title?: string; autoPrint?: boolean },
    private dialogRef: MatDialogRef<ReceiptDialogComponent>,
    private barService: ServiceBarMethod,
    private systemSetting: SystemSettingService,
    private uploadedImage: UploadedImageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const uids = this.data.billUids?.length ? this.data.billUids : this.data.billUid ? [this.data.billUid] : [];
    if (!uids.length) {
      this.loading = false;
      return;
    }
    forkJoin({
      all: forkJoin(uids.map((uid) => this.barService.findBillReceipt(uid))),
      logo: this.systemSetting.getLogo().pipe(
        switchMap((res) => this.uploadedImage.load(res?.data?.logoImage)),
        catchError(() => of(null)),
      ),
    }).subscribe({
      next: ({ all, logo }) => {
        this.receipts = all.map((res) => res?.data).filter(Boolean);
        this.logoUrl = logo;
        this.loading = false;
        this.cdr.detectChanges();
        if (this.data.autoPrint) {
          this.print().then(() => this.dialogRef.close());
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        if (this.data.autoPrint) {
          this.dialogRef.close();
        }
      },
    });
  }

  get many(): boolean {
    return this.receipts.length > 1;
  }

  get grandTotal(): number {
    return this.receipts.reduce((sum, r) => sum + (Number(r?.total) || 0), 0);
  }

  totalChange(receipt: any): number {
    return (receipt?.payments ?? []).reduce((sum: number, p: any) => sum + (p.change ?? 0), 0);
  }

  async print(): Promise<void> {
    const pages = Array.from(this.papers?.nativeElement.querySelectorAll<HTMLElement>(':scope > .r-paper') ?? [])
      .map((el) => el.innerHTML);
    if (!pages.length) {
      return;
    }
    // One bill: two identical copies in one job (one for the customer, one
    // for the bar), each on its own page so a receipt printer cuts between
    // them - no "customer copy" heading, by request. Several bills (a
    // handover): the summary, then each bill once, each on its own page.
    // The branch's name, faint and slanted, repeated across the whole slip
    // behind the text - seen from a distance, it says whose receipt it is.
    const branch = escapeHtml(this.receipts[0]?.branchName || 'Midland Bar');
    const watermark = `<div class="r-wm" aria-hidden="true">${Array(ReceiptDialogComponent.WATERMARK_REPEAT).fill(`<span>${branch}</span>`).join('')}</div>`;
    const paper = (html: string) => `<div class="r-paper">${watermark}${html}</div>`;
    const copies = this.many ? pages.map(paper).join('') : [pages[0], pages[0]].map(paper).join('');
    // A hidden frame, not a popup window: nothing for a popup blocker to stop,
    // and nothing to close. With Chrome started with --kiosk-printing it goes
    // straight to the default printer, with no print dialog.
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>${this.data.title ?? this.receipts[0]?.code ?? 'Receipt'}</title>
      <style>
        * { box-sizing: border-box; }
        /* A receipt roll, not an A4 sheet: the full 58mm width, each copy only as long as it is (set below). */
        html, body { margin: 0; padding: 0; width: ${ReceiptDialogComponent.PAPER_MM}mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
        .r-paper { width: 100%; margin: 0; padding: 3mm ${ReceiptDialogComponent.SIDE_MM}mm; position: relative; overflow: hidden; }
        .r-paper > *:not(.r-wm) { position: relative; z-index: 1; }
        .r-wm {
          position: absolute; inset: -30% -60%; z-index: 0; pointer-events: none;
          display: flex; flex-wrap: wrap; align-content: space-around; justify-content: center; gap: 5mm 6mm;
          transform: rotate(-30deg);
        }
        .r-logo { display: block; margin: 0 auto 2mm; max-width: 26mm; max-height: 18mm; object-fit: contain; filter: grayscale(1) contrast(1.3); }
        .r-wm span { font-size: 15px; font-weight: 700; letter-spacing: 1px; white-space: nowrap; color: #000; opacity: ${ReceiptDialogComponent.WATERMARK_OPACITY}; }
        .r-paper + .r-paper { page-break-before: always; break-before: page; }
        .r-center { text-align: center; }
        .r-title { font-size: 16px; font-weight: 700; }
        .r-muted { color: #000; }
        .r-rule { border-top: 1px dashed #000; margin: 6px 0; }
        .r-row { display: flex; justify-content: space-between; gap: 8px; }
        .r-total { font-size: 14px; font-weight: 700; }
        .r-sub { padding-left: 10px; font-size: 11px; }
      </style><style id="page-size"></style></head><body>${copies}</body></html>`);
    win.document.close();
    // The logo has to be in before the page is measured and printed; a logo
    // that will not load (offline) is left out rather than holding the print.
    await Promise.all(Array.from(win.document.images).map((img) => img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => { img.remove(); resolve(); };
          setTimeout(resolve, 2500);
        })));
    // Each copy's page is exactly as long as the tallest copy: a short slip,
    // cut after it, instead of a full page of blank paper.
    const tallestPx = Math.max(...Array.from(win.document.querySelectorAll<HTMLElement>('.r-paper')).map((el) => el.offsetHeight), 0);
    // Never shorter than it is wide: a page wider than tall is landscape, and
    // the printer turns the slip on its side.
    const lengthMm = Math.max(Math.ceil(tallestPx * 25.4 / 96) + 4, ReceiptDialogComponent.PAPER_MM + 12);
    win.document.getElementById('page-size')!.textContent =
      `@page { size: ${ReceiptDialogComponent.PAPER_MM}mm ${lengthMm}mm; margin: 0; }`;
    const done = () => setTimeout(() => frame.remove(), 500);
    win.addEventListener('afterprint', done, { once: true });
    win.focus();
    win.print();
    // Browsers that don't fire afterprint for a frame: tidy up anyway.
    setTimeout(() => frame.isConnected && frame.remove(), 60000);
  }

  close(): void {
    this.dialogRef.close();
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
