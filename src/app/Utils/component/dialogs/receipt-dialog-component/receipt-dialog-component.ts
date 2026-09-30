import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServiceBarMethod } from '../../../../pos/service-bar-method';

/**
 * A bill's receipt, laid out for a narrow receipt printer. Print opens it
 * alone in a small window so the rest of the app does not print with it.
 */
@Component({
  selector: 'app-receipt-dialog-component',
  imports: [MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './receipt-dialog-component.html',
  styleUrl: './receipt-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceiptDialogComponent implements OnInit {
  @ViewChild('paper') paper?: ElementRef<HTMLElement>;

  receipt: any = null;
  loading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { billUid: string },
    private dialogRef: MatDialogRef<ReceiptDialogComponent>,
    private barService: ServiceBarMethod,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.barService.findBillReceipt(this.data.billUid).subscribe({
      next: (res) => {
        this.receipt = res?.data ?? null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get totalChange(): number {
    return (this.receipt?.payments ?? []).reduce((sum: number, p: any) => sum + (p.change ?? 0), 0);
  }

  print(): void {
    const html = this.paper?.nativeElement.innerHTML;
    if (!html) {
      return;
    }
    // Two copies in one job - the customer's and the bar's - each on its own
    // page, so a receipt printer cuts between them.
    const copies = ['RECEIPT.CUSTOMER_COPY', 'RECEIPT.BAR_COPY']
      .map((key) => `<div class="r-paper"><div class="r-center r-copy">${this.translate.instant(key)}</div>${html}</div>`)
      .join('');
    const win = window.open('', '_blank', 'width=380,height=640');
    if (!win) {
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${this.receipt?.code ?? 'Receipt'}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 8px; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
        .r-paper { width: 280px; margin: 0 auto; }
        .r-paper + .r-paper { page-break-before: always; break-before: page; }
        .r-copy { margin-bottom: 4px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
        .r-center { text-align: center; }
        .r-title { font-size: 16px; font-weight: 700; }
        .r-muted { color: #000; }
        .r-rule { border-top: 1px dashed #000; margin: 6px 0; }
        .r-row { display: flex; justify-content: space-between; gap: 8px; }
        .r-total { font-size: 14px; font-weight: 700; }
        .r-sub { padding-left: 12px; font-size: 11px; }
        @page { margin: 4mm; }
      </style></head><body>${copies}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
