import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ServiceBarMethod } from '../service-bar-method';
import { Authentication } from '../../Utils/services/authentication';
import { PAYMENT_METHODS } from '../../Utils/component/dialogs/pay-bill-dialog-component/pay-bill-dialog-component';

type Tab = 'SUPPLIERS' | 'ORDERS' | 'PRICES';

/**
 * POS > Wasambazaji: who the bar buys from and what is owed to each, purchase
 * orders and receiving against them (the store goes up), paying a supplier,
 * and what each product was bought at over time.
 */
@Component({
  selector: 'app-suppliers',
  imports: [FormsModule, MatIconModule, DecimalPipe, DatePipe, TranslatePipe],
  templateUrl: './suppliers.html',
  styleUrl: '../debts/debts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Suppliers implements OnInit {
  private bar = inject(ServiceBarMethod);
  private auth = inject(Authentication);
  private cdr = inject(ChangeDetectorRef);

  readonly canManage = this.auth.hasPermission('MANAGE_SUPPLIERS');
  readonly canReceive = this.auth.hasPermission('SAVE_STORE');
  readonly methods = PAYMENT_METHODS;
  tab: Tab = 'SUPPLIERS';
  busy = false;

  suppliers: any[] = [];
  orders: any[] = [];
  products: any[] = [];

  /** The open panel. */
  supplierForm: any = null;
  paying: any = null;
  ledger: any = null;
  orderForm: any = null;
  order: any = null;
  receiving: Record<string, number | null> = {};
  priceProduct = '';
  prices: any[] = [];

  ngOnInit(): void {
    this.load();
    this.bar.findBarServiceList().subscribe((res: any) => {
      this.products = (res?.data ?? []).filter((s: any) => s.trackStock && s.kind !== 'STOCK_ITEM')
        .sort((a: any, b: any) => (a.serviceName ?? '').localeCompare(b.serviceName ?? ''));
      this.cdr.markForCheck();
    });
  }

  load(): void {
    this.bar.findSuppliers().subscribe((r) => { this.suppliers = r?.data ?? []; this.cdr.markForCheck(); });
    this.bar.findPurchaseOrders().subscribe((r) => { this.orders = r?.data ?? []; this.cdr.markForCheck(); });
  }

  get openOrders(): number {
    return this.orders.filter((o) => o.status === 'OPEN' || o.status === 'PARTIAL').length;
  }

  get owedTotal(): number {
    return this.suppliers.reduce((s, x) => s + Math.max(0, Number(x.owed) || 0), 0);
  }

  private done<T>(obs: any, after: (d: any) => void): void {
    if (this.busy) return;
    this.busy = true;
    obs.subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.data) after(res.data);
        this.cdr.markForCheck();
      },
      error: () => { this.busy = false; this.cdr.markForCheck(); },
    });
  }

  // suppliers
  newSupplier(): void { this.closeAll(); this.supplierForm = { name: '', phone: '', contactPerson: '', note: '' }; }
  editSupplier(s: any): void { this.closeAll(); this.supplierForm = { ...s }; }
  saveSupplier(): void {
    const f = this.supplierForm;
    this.done(this.bar.saveSupplier(f, f.uid), () => { this.supplierForm = null; this.load(); });
  }
  openLedger(s: any): void {
    this.closeAll();
    this.bar.findSupplierLedger(s.uid).subscribe((r) => { this.ledger = r?.data ?? null; this.cdr.markForCheck(); });
  }
  startPay(s: any): void { this.closeAll(); this.paying = { supplierUid: s.uid, name: s.name, owed: s.owed, amount: s.owed, method: 'cash', fromDrawer: true, note: '' }; }
  pay(): void {
    const p = this.paying;
    this.done(this.bar.paySupplier({ supplierUid: p.supplierUid, amount: p.amount, method: p.method, fromDrawer: p.fromDrawer, note: p.note }),
      () => { this.paying = null; this.load(); });
  }

  // orders
  newOrder(): void {
    this.closeAll();
    this.orderForm = { supplierUid: this.suppliers[0]?.uid ?? '', expectedOn: '', note: '', lines: [{ serviceUid: '', packs: 1, packPrice: null }] };
  }
  addLine(): void { this.orderForm.lines.push({ serviceUid: '', packs: 1, packPrice: null }); }
  removeLine(i: number): void { this.orderForm.lines.splice(i, 1); }
  pickProduct(l: any): void {
    const p = this.products.find((x) => x.uid === l.serviceUid);
    if (p && !l.packPrice) l.packPrice = p.buyingPrice ?? null;
  }
  get orderTotal(): number {
    return (this.orderForm?.lines ?? []).reduce((s: number, l: any) => s + (Number(l.packs) || 0) * (Number(l.packPrice) || 0), 0);
  }
  saveOrder(): void {
    const f = this.orderForm;
    const body = { ...f, expectedOn: f.expectedOn || null, lines: f.lines.filter((l: any) => l.serviceUid) };
    this.done(this.bar.createPurchaseOrder(body), (d) => { this.orderForm = null; this.load(); this.openOrder(d); });
  }
  openOrder(o: any): void {
    this.closeAll();
    this.bar.findPurchaseOrder(o.uid).subscribe((r) => {
      this.order = r?.data ?? null;
      this.receiving = {};
      for (const l of this.order?.lines ?? []) this.receiving[l.uid] = Math.max(0, l.packs - l.receivedPacks) || null;
      this.cdr.markForCheck();
    });
  }
  receive(): void {
    const lines = Object.entries(this.receiving).filter(([, n]) => (Number(n) || 0) > 0).map(([lineUid, packs]) => ({ lineUid, packs }));
    this.done(this.bar.receivePurchaseOrder(this.order.uid, { lines }), (d) => { this.load(); this.openOrder(d); });
  }
  cancelOrder(): void {
    this.done(this.bar.cancelPurchaseOrder(this.order.uid), () => { this.order = null; this.load(); });
  }

  // prices
  loadPrices(): void {
    if (!this.priceProduct) { this.prices = []; return; }
    this.bar.findPurchasePrices(this.priceProduct).subscribe((r) => { this.prices = r?.data ?? []; this.cdr.markForCheck(); });
  }

  closeAll(): void {
    this.supplierForm = this.paying = this.ledger = this.orderForm = this.order = null;
  }
}
