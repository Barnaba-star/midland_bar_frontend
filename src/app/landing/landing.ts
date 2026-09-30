import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  imports: [MatIconModule, DecimalPipe, TranslatePipe],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  currentYear = new Date().getFullYear();

  readonly menu = ['Castle Lite', 'Kilimanjaro', 'Mshikaki', 'Nyama choma', 'Safari Lager', 'Kuku choma', 'Ndizi choma', 'Konyagi', 'Mbuzi choma', 'Soda'];

  /** The bar itself - each photo tied to the part of the system behind it. */
  readonly gallery = [
    { key: 'counter', src: 'assets/images/bar/bar-glow.jpg', icon: 'local_bar', caption: 'LANDING.G_COUNTER', note: 'LANDING.G_COUNTER_NOTE' },
    { key: 'beer', src: 'assets/images/bar/beer-pour.jpg', icon: 'sports_bar', caption: 'LANDING.G_BEER', note: 'LANDING.G_BEER_NOTE' },
    { key: 'grill', src: 'assets/images/bar/mshikaki.jpg', icon: 'outdoor_grill', caption: 'LANDING.G_GRILL', note: 'LANDING.G_GRILL_NOTE' },
    { key: 'cocktails', src: 'assets/images/bar/cocktails.jpg', icon: 'liquor', caption: 'LANDING.G_COCKTAILS', note: 'LANDING.G_COCKTAILS_NOTE' },
    { key: 'crowd', src: 'assets/images/bar/crowd.jpg', icon: 'nightlife', caption: 'LANDING.G_CROWD', note: 'LANDING.G_CROWD_NOTE' },
  ];

  /** A night at the till, first bill to the split. */
  readonly steps = [
    { no: '01', icon: 'receipt_long', photo: 'assets/images/bar/toast-table.jpg', title: 'LANDING.STEP1_TITLE', desc: 'LANDING.STEP1_DESC' },
    { no: '02', icon: 'add_shopping_cart', photo: 'assets/images/bar/ribs.jpg', title: 'LANDING.STEP2_TITLE', desc: 'LANDING.STEP2_DESC' },
    { no: '03', icon: 'payments', photo: 'assets/images/bar/phone-pay.jpg', title: 'LANDING.STEP3_TITLE', desc: 'LANDING.STEP3_DESC' },
    { no: '04', icon: 'donut_small', photo: 'assets/images/bar/bar-crowd.jpg', title: 'LANDING.STEP4_TITLE', desc: 'LANDING.STEP4_DESC' },
  ];

  readonly features = [
    { icon: 'inventory_2', photo: 'assets/images/bar/taps.jpg', title: 'LANDING.F1_TITLE', desc: 'LANDING.F1_DESC', wide: true },
    { icon: 'print', photo: 'assets/images/bar/cashier.jpg', title: 'LANDING.F2_TITLE', desc: 'LANDING.F2_DESC', wide: false },
    { icon: 'badge', photo: 'assets/images/bar/bartender.jpg', title: 'LANDING.F3_TITLE', desc: 'LANDING.F3_DESC', wide: false },
    { icon: 'query_stats', photo: 'assets/images/bar/laptop.jpg', title: 'LANDING.F4_TITLE', desc: 'LANDING.F4_DESC', wide: false },
    { icon: 'storefront', photo: 'assets/images/bar/bar-counter.jpg', title: 'LANDING.F5_TITLE', desc: 'LANDING.F5_DESC', wide: false },
  ];

  /** The food split, shown on a 10,000 sale - pct is the share, so pct x 100 is the shillings. */
  readonly buckets = [
    { key: 'owner', label: 'LANDING.B_OWNER', pct: 40, color: '#f5a524' },
    { key: 'stock', label: 'LANDING.B_STOCK', pct: 18, color: '#e76f51' },
    { key: 'staff', label: 'LANDING.B_STAFF', pct: 10, color: '#2a9d8f' },
    { key: 'rent', label: 'LANDING.B_RENT', pct: 10, color: '#8ab17d' },
    { key: 'tra', label: 'LANDING.B_TRA', pct: 5, color: '#6c8ebf' },
    { key: 'loan', label: 'LANDING.B_LOAN', pct: 5, color: '#b56576' },
    { key: 'luku', label: 'LANDING.B_LUKU', pct: 3, color: '#e9c46a' },
    { key: 'maint', label: 'LANDING.B_MAINT', pct: 3, color: '#9c89b8' },
    { key: 'water', label: 'LANDING.B_WATER', pct: 2, color: '#48cae4' },
    { key: 'emergency', label: 'LANDING.B_EMERGENCY', pct: 2, color: '#d62828' },
    { key: 'other', label: 'LANDING.B_OTHER', pct: 2, color: '#adb5bd' },
  ];

  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['login']);
  }
}
