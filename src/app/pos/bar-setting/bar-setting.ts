import { UnitLabelPipe } from '../../Utils/pipes/stock-packs.pipe';
import { StockItemDialogComponent, StockItemResult } from '../../Utils/component/dialogs/stock-item-dialog-component/stock-item-dialog-component';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, Title2 } from "../../Utils/component/title2/title2";
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from "@angular/material/icon";
import { FormField } from '../../Utils/models/form-field';
import { CommissionDTO, BarServiceData, BarServiceDTO, UserTableData } from '../BarModel';
import { ServiceBarMethod } from '../service-bar-method';
import { AlertService } from '../../Utils/services/alert';
import { RecordtableComponent } from "../../Utils/component/recordtable/recordtable";
import { PageableParam, TableColumn } from '../../Utils/models/responces';
import { MatTableDataSource } from '@angular/material/table';
import { TableComponent } from "../../Utils/component/table/table";
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../Utils/component/dialog/dialog';
import { ServiceDetailsDialogComponent } from '../../Utils/component/dialogs/service-details-dialog-component/service-details-dialog-component';
import { error } from 'console';
import { DeleteConfirmationComponent } from '../../Utils/component/dialogs/delete-confirmation-component/delete-confirmation-component';
import { UserRoleDialogComponent } from '../../Utils/component/dialogs/user-role-dialog-component/user-role-dialog-component';
import { ActivationCodeDialogComponent } from '../../Utils/component/dialogs/activation-code-dialog-component/activation-code-dialog-component';
import { SelectStaffDialogComponent } from '../../Utils/component/dialogs/select-staff-dialog-component/select-staff-dialog-component';
import { UserService } from '../../settings/users-setting/user-service';
import { AssignUserRoleDTO, UserDTO } from '../../settings/users-setting/user-model';
import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { ComfirmDialogComponent } from '../../Utils/component/comfirm-dialog/comfirm-dialog';

export interface BarServiceEntity {
  uid?: string;
  serviceName?: string;
  serviceCode?: string;
  status?: string;
  description?: string;
  commissionType?: string;
  commissionValue?: number;
  category?: string;
  unit?: string;
  packUnit?: string;
  unitsPerPack?: number;
  kind?: string;
  stockSource?: string;
  stockSourceUid?: string;
  stockSourceName?: string;
  unitsPerSale?: number;
  sourceStockQuantity?: number;
  unitLadder?: any;
  saleUnitName?: string;
  saleUnitCount?: number;
  buyingPrice?: number;
  stockQuantity?: number;
  lowStock?: boolean;
  trackStock?: boolean;
  price?: number;
  updatedAt?: string | null;
  usageType?:string;
}

/** Stored as DRINK / FOOD - the backend's ProductCategory. */
const PRODUCT_CATEGORY_OPTIONS = [
  { value: 'DRINK', label: 'SETTING_PAGE.CATEGORY_DRINK' },
  { value: 'FOOD', label: 'SETTING_PAGE.CATEGORY_FOOD' }
];

/** How stock is bought. '' = one unit at a time, no pack. */
const PRODUCT_PACK_OPTIONS = [
  { value: '', label: 'PRODUCT_FORM.NO_PACK' },
  { value: 'Crate', label: 'PRODUCT_FORM.UNIT_CRATE' },
  { value: 'Carton', label: 'PRODUCT_FORM.UNIT_CARTON' },
  { value: 'Box', label: 'PRODUCT_FORM.UNIT_BOX' },
  { value: 'Bottle', label: 'PRODUCT_FORM.UNIT_BOTTLE' },
  { value: 'Kilo', label: 'PRODUCT_FORM.UNIT_KILO' },
  { value: 'Whole', label: 'PRODUCT_FORM.UNIT_WHOLE' }
];

/** What a stock item is counted in - the smallest thing a service takes of it. */
const STOCK_UNIT_OPTIONS = [
  { value: 'Stick', label: 'PRODUCT_FORM.UNIT_STICK' },
  { value: 'Piece', label: 'PRODUCT_FORM.UNIT_PIECE' },
  { value: 'Quarter', label: 'PRODUCT_FORM.UNIT_QUARTER' },
  { value: 'Bottle', label: 'PRODUCT_FORM.UNIT_BOTTLE' }
];

@Component({
  selector: 'app-bar-setting',
  imports: [
    EmptyStateComponent,Title2, MatIconModule, RecordtableComponent, DecimalPipe, UpperCasePipe, CommonModule, FormsModule, MatMenuModule, MatPaginator, MatButtonModule, TranslatePipe, MatTooltipModule, UnitLabelPipe],
  templateUrl: './bar-setting.html',
  styleUrl: './bar-setting.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarSetting implements OnInit{
// Templates can't see the global `Math` object directly — expose it
// here so `Math.min(...)` in bar-setting.html resolves.
protected readonly Math = Math;

changePage(arg0: number) {
throw new Error('Method not implemented.');
}
changePageSize($event: Event) {
throw new Error('Method not implemented.');
}

  barServiceInfo:Boolean=false;
  barServiceAddForm:Boolean=false;
  constructor(
    private visibility: Authentication, private service: ServiceBarMethod, private alertService: AlertService, private cdr: ChangeDetectorRef,
    private dialog:MatDialog, private barService:ServiceBarMethod, private userService: UserService,
    private translate: TranslateService
  ) { }
  ngOnInit(): void {
    this.selectedSetting='SALON.SERVICE'
      this.barServiceInfo=false;
  this.barServiceAddForm=false;
  this.serviceDataSource.data=[];
  this.findBarServicePage();
  this.addCommission=false;
  }
  selectedSetting = '';
  titleActions: TitleAction[] = [
    {
      icon: 'person2',
      title: 'SALON.STAFF',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },
    {
      icon: 'service',
      title: 'SALON.SERVICE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },

    {
      icon: 'commission',
      title: 'SALON.COMMISSION',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },
    {
      icon: 'more',
      title: 'SALON.BILL_CODES',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    }
  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string) {
  this.selectedSetting = action;
  if (action === 'SALON.BILL_CODES') {
    this.loadBillCodes();
  }
 if (action === 'SALON.SERVICE') {
  this.barServiceInfo=false;
  this.barServiceAddForm=false;
  this.serviceDataSource.data=[];
  this.findBarServicePage();
  this.addCommission=false;

 }
  if (action === 'SALON.COMMISSION') {
  this.addCommission=false;
  this.findCommissionPage();

 }
 if(action === 'SALON.STAFF'){
  this.findUserPageByBranch();

 }
}
/** Stock items (beef, goat meat) that services can be made from - loaded when a service form opens. */
stockItems: any[] = [];

/** A stock item's measures, smallest first (the unit alone for one saved before ladders). */
private ladderOf(item: any): string[] {
  try {
    const ladder = JSON.parse(item.unitLadder ?? '[]') as { name: string }[];
    if (ladder.length) {
      return ladder.map((l) => l.name);
    }
  } catch {
    // fall through
  }
  return [item.unit || this.translate.instant('PRODUCT_FORM.UNIT_PIECE')];
}

private loadStockItems(then: () => void) {
  this.service.findBarServiceList().subscribe({
    next: (res) => {
      this.stockItems = (res.data ?? []).filter((s: any) => s.kind === 'STOCK_ITEM');
      then();
    },
    error: (err) => {
      console.error('Error loading stock items:', err);
      this.stockItems = [];
      then();
    },
  });
}

/**
 * A service sold at the counter. "Stock" says how it is counted: itself
 * (a crate of Castle Lite), not at all (chips), or out of a stock item -
 * a mshikaki takes 1 unit of beef, a robo takes 5.
 */
private serviceFormFields(): FormField[] {
  return [
    { name: 'serviceName', type: 'text', label: 'PRODUCT_FORM.NAME', placeholder: 'PRODUCT_FORM.NAME_PH', required: true },
    { name: 'category', type: 'select', label: 'PRODUCT_FORM.CATEGORY', placeholder: 'PRODUCT_FORM.CATEGORY', required: true, options: PRODUCT_CATEGORY_OPTIONS },
    { name: 'price', type: 'number', label: 'PRODUCT_FORM.SELLING_PRICE', placeholder: 'PRODUCT_FORM.SELLING_PRICE_PH', required: true },
    {
      name: 'stockSource',
      type: 'select',
      label: 'PRODUCT_FORM.STOCK_SOURCE',
      placeholder: 'PRODUCT_FORM.STOCK_SOURCE',
      required: true,
      options: [
        { value: 'SELF', label: 'PRODUCT_FORM.SOURCE_SELF' },
        { value: 'NONE', label: 'PRODUCT_FORM.SOURCE_NONE' },
        // One choice per measure of each stock item: "Beef › Nusu".
        ...this.stockItems.flatMap((item) => this.ladderOf(item).map((level) => ({
          value: `${item.uid}|${level}`,
          label: this.translate.instant('PRODUCT_FORM.SOURCE_FROM_LEVEL', { name: item.serviceName, level }),
        }))),
      ],
    },
    { name: 'saleUnitCount', type: 'number', label: 'PRODUCT_FORM.SALE_UNIT_COUNT', placeholder: 'PRODUCT_FORM.SALE_UNIT_COUNT_PH' },
    { name: 'packUnit', type: 'select', label: 'PRODUCT_FORM.PACK_UNIT', placeholder: 'PRODUCT_FORM.PACK_UNIT', options: PRODUCT_PACK_OPTIONS },
    { name: 'unitsPerPack', type: 'number', label: 'PRODUCT_FORM.UNITS_PER_PACK', placeholder: 'PRODUCT_FORM.UNITS_PER_PACK_PH' },
    { name: 'buyingPrice', type: 'number', label: 'PRODUCT_FORM.BUYING_PRICE', placeholder: 'PRODUCT_FORM.BUYING_PRICE_PH' },
    { name: 'description', type: 'textarea', label: 'PRODUCT_FORM.DESCRIPTION', placeholder: 'PRODUCT_FORM.DESCRIPTION_PH' },
  ];
}

/**
 * Something kept in the store and never sold as-is - beef, bought by the
 * kilo and counted in mishikaki (1 kilo = 20, say).
 */
private stockItemFormFields(): FormField[] {
  return [
    { name: 'serviceName', type: 'text', label: 'PRODUCT_FORM.STOCK_ITEM_NAME', placeholder: 'PRODUCT_FORM.STOCK_ITEM_NAME_PH', required: true },
    { name: 'category', type: 'select', label: 'PRODUCT_FORM.CATEGORY', placeholder: 'PRODUCT_FORM.CATEGORY', required: true, options: PRODUCT_CATEGORY_OPTIONS },
    { name: 'unit', type: 'select', label: 'PRODUCT_FORM.COUNTED_IN', placeholder: 'PRODUCT_FORM.COUNTED_IN', required: true, options: STOCK_UNIT_OPTIONS },
    { name: 'packUnit', type: 'select', label: 'PRODUCT_FORM.PACK_UNIT', placeholder: 'PRODUCT_FORM.PACK_UNIT', options: PRODUCT_PACK_OPTIONS },
    { name: 'unitsPerPack', type: 'number', label: 'PRODUCT_FORM.UNITS_PER_PACK', placeholder: 'PRODUCT_FORM.UNITS_PER_PACK_STOCK_PH' },
    { name: 'buyingPrice', type: 'number', label: 'PRODUCT_FORM.BUYING_PRICE', placeholder: 'PRODUCT_FORM.BUYING_PRICE_PH', required: true },
    { name: 'description', type: 'textarea', label: 'PRODUCT_FORM.DESCRIPTION', placeholder: 'PRODUCT_FORM.DESCRIPTION_PH' },
  ];
}

barServiceEntity: BarServiceEntity = {};
barServiceList: BarServiceEntity[] = [];
serviceColumns: {
  field: string;
  header: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconColor?: string;
  cellColors?: {
    [value: string]: {
      background: string;
      color: string;
    };
  };
}[] = [
  {
    field: 'serviceName',
    header: 'Service',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#413e58'
  },
  {
    field: 'serviceCode',
    header: 'Code'
  },
  {
    field: 'price',
    header: 'Price',
    icon: 'more',
    iconPosition: 'left',
    iconColor: '#28a745'
  },
  {
    field: 'category',
    header: 'Category'
  },
  {
    field: 'buyingPrice',
    header: 'Buying Price'
  },

  {
    field: 'status',
    header: 'Status'
  }
];
onAddService(){
  this.barServiceInfo=false;
  this.loadStockItems(() => this.openServiceDialog('SERVICE'));
}

onAddStockItem(){
  this.barServiceInfo=false;
  this.openStockItemDialog();
}

/** Stock items have their own form: a ladder of measures is a list, not a fixed set of fields. */
private openStockItemDialog(row?: any) {
  const dialogRef = this.dialog.open(StockItemDialogComponent, {
    width: '760px',
    maxWidth: '95vw',
    autoFocus: false,
    data: { item: row },
  });
  dialogRef.afterClosed().subscribe((result?: StockItemResult) => {
    if (!result) {
      return;
    }
    const dto: BarServiceDTO = {
      uid: row?.uid,
      kind: 'STOCK_ITEM',
      serviceName: result.serviceName,
      category: result.category,
      unitLadder: result.unitLadder,
      buyingPrice: result.buyingPrice,
      description: result.description,
    };
    this.service.saveBarEntity(dto).subscribe({
      next: (response) => {
        if (response?.data) {
          this.alertService.show('success', this.translate.instant(row ? 'PRODUCT_FORM.UPDATED' : 'PRODUCT_FORM.SAVED'));
          this.findBarServicePage();
          this.cdr.markForCheck();
        }
      },
      error: (error) => console.error('Error saving stock item:', error),
    });
  });
}

/** The add/edit form for either kind; row is the record being edited, if any. */
private openServiceDialog(kind: 'SERVICE' | 'STOCK_ITEM', row?: any) {
  const isStockItem = kind === 'STOCK_ITEM';
  const title = row
    ? (isStockItem ? 'PRODUCT_FORM.EDIT_STOCK_ITEM_TITLE' : 'PRODUCT_FORM.EDIT_TITLE')
    : (isStockItem ? 'PRODUCT_FORM.ADD_STOCK_ITEM_TITLE' : 'PRODUCT_FORM.ADD_TITLE');
  const formData = row
    ? {
        ...row,
        stockSource: row.stockSourceUid
          ? `${row.stockSourceUid}|${row.saleUnitName ?? ''}`
          : (row.trackStock ? 'SELF' : 'NONE'),
        saleUnitCount: row.saleUnitCount ?? row.unitsPerSale ?? 1,
      }
    : (isStockItem ? {} : { stockSource: 'SELF', saleUnitCount: 1 });

  const dialogRef = this.dialog.open(DialogComponent, {
    width: '720px',
    maxWidth: '95vw',
    autoFocus: false,
    data: {
      formTitle: title,
      fields: isStockItem ? this.stockItemFormFields() : this.serviceFormFields(),
      formData,
    },
  });

  dialogRef.afterClosed().subscribe((data) => {
    if (!data) {
      return;
    }
    const dto: BarServiceDTO = {
      uid: row?.uid,
      kind,
      serviceName: data.serviceName,
      category: data.category,
      description: data.description,
      packUnit: data.packUnit || undefined,
      unitsPerPack: data.unitsPerPack === '' ? undefined : data.unitsPerPack,
      buyingPrice: data.buyingPrice === '' ? undefined : data.buyingPrice,
    };
    if (isStockItem) {
      dto.unit = data.unit;
    } else {
      dto.price = data.price;
      const count = Number(data.saleUnitCount) || 1;
      if (typeof data.stockSource === 'string' && data.stockSource.includes('|')) {
        // "uid|Nusu": made from that stock item, one sale = count x Nusu.
        const [uid, level] = data.stockSource.split('|');
        dto.stockSource = uid;
        if (level) {
          dto.saleUnitName = level;
          dto.saleUnitCount = count;
        } else {
          dto.unitsPerSale = count;
        }
      } else {
        dto.stockSource = data.stockSource;
      }
    }
    this.service.saveBarEntity(dto).subscribe({
      next: (response) => {
        if (response?.data) {
          this.alertService.show('success', this.translate.instant(row ? 'PRODUCT_FORM.UPDATED' : 'PRODUCT_FORM.SAVED'));
          this.findBarServicePage();
          this.cdr.markForCheck();
        }
      },
      error: (error) => console.error('Error saving service:', error),
    });
  });
}

   onViewRecord(row: any) {
    this.dialog.open(ServiceDetailsDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: row,
    });
   }

   param:PageableParam = {
    page: 0,
    size: 5,
  }
  onPageChange(newPage: number) {
    this.param.page = newPage;
  }


serviceDataSource = new MatTableDataSource<BarServiceEntity>([]);
serviceEditUID:string='';
tableConfig = {
  displayedColumns: [
    { field: 'serviceName', header: 'SERVICE NAME' },
    { field: 'serviceCode', header: 'SERVICE CODE' },
    { field: 'price', header: 'PRICE' },
    { field: 'category', header: 'CATEGORY' },
    { field: 'buyingPrice', header: 'BUYING PRICE' },
    { field: 'status', header: 'STATUS' }
  ] as TableColumn[]
};

findBarServicePage() {
  this.barServiceAddForm = false;
  this.barServiceInfo = false;
  this.barServiceEntity = {};

  this.param = {
    page: this.page,
    size: this.size
  };

  this.service.findBarServicePage(this.param).subscribe({
    next: (response) => {
      if (response) {
        this.serviceDataSource.data = response.data || [];

        // Pagination information kutoka backend
        this.totalElements = response.totalElements || 0;
        this.totalPages = response.totalPages || 0;

        console.log('Page:', this.page);
        console.log('Size:', this.size);
        console.log('Total Elements:', this.totalElements);
        console.log('Total Pages:', this.totalPages);
        console.log('Services:', this.serviceDataSource.data);

        this.cdr.detectChanges();
      }
    },

    error: (error) => {
      console.error('Error fetching bar service page:', error);
    }
  });
}

previousPage() {
  if (this.page > 0) {
    this.page--;
    this.findBarServicePage();
  }
}

nextPage() {
  if (this.page < this.totalPages - 1) {
    this.page++;
    this.findBarServicePage();
  }
}



   onEditRecord(row: any) {
    this.serviceEditUID = row.uid;
    if (row.kind === 'STOCK_ITEM') {
      this.openStockItemDialog(row);
    } else {
      this.loadStockItems(() => this.openServiceDialog('SERVICE', row));
    }
   }
   onDeleteRecord(row:any){
    const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
      width: '420px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        itemName: row.serviceName || row.serviceCode || 'Service',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteService(row.uid);
      }
    });
   }

    private deleteService(serviceUID: string): void {
    this.service.deleteServiceBarByUID(serviceUID).subscribe({
      next:(res)=>{
        if(res){
          console.log('Service Deleted Successfully', res.data);
          this.alertService.show('success', this.translate.instant('PRODUCT_FORM.DELETED'));
          this.findBarServicePage();
          this.cdr.markForCheck();
        }
      },
      error:(error)=>{
        console.error('Error Occurred', error)
        this.alertService.show('error', this.translate.instant('PRODUCT_FORM.DELETE_FAILED'));
      }
    })
   }



   /****
    * ************************************************************************** COMMISSIONS METHODS*****************************************************************
    *
    * Every service is listed with its split. Choosing one opens the split
    * editor: a percentage per bucket, typed directly - what is typed is what
    * is stored (the backend keeps whole percentages) - with the Tshs each
    * comes to on one unit shown beside it.
    */

// Shared with the Services and Users tabs, which page with the same fields.
page = 0;
size = 5;
totalElements = 0;
totalPages = 0;

readonly commissionBuckets: { key: keyof CommissionDTO; label: string }[] = [
  { key: 'staffPercent', label: 'COMMISSION_BREAKDOWN.STAFF' },
  { key: 'ownerPercent', label: 'COMMISSION_BREAKDOWN.OWNER' },
  { key: 'traPercent', label: 'COMMISSION_BREAKDOWN.TRA' },
  { key: 'maintenancePercent', label: 'COMMISSION_BREAKDOWN.MAINTENANCE' },
  { key: 'emergencyPercent', label: 'COMMISSION_BREAKDOWN.EMERGENCY' },
  { key: 'loanPercent', label: 'COMMISSION_BREAKDOWN.LOAN' },
  { key: 'rentPercent', label: 'COMMISSION_BREAKDOWN.RENT' },
  { key: 'lukuPercent', label: 'COMMISSION_BREAKDOWN.LUKU' },
  { key: 'waterPercent', label: 'COMMISSION_BREAKDOWN.WATER' },
  { key: 'stockPurchasePercent', label: 'COMMISSION_BREAKDOWN.STOCK_PURCHASE' },
  { key: 'otherPercent', label: 'COMMISSION_BREAKDOWN.OTHER' },
];

/** Kept so the tab switch (onAction) can still reset it. */
addCommission: Boolean = false;

serviceCommissions: any[] = [];
commissionPage = 0;
commissionSize = 10;
commissionTotalPages = 0;
commissionTotalElements = 0;
commissionSearch = '';
private commissionSearchTimer?: ReturnType<typeof setTimeout>;

/** The service whose split is open in the editor, or null. */
editingService: any = null;
/** Percent per bucket key while editing. */
splitDraft: Record<string, number> = {};
savingCommission = false;

findCommissionPage() {
  this.editingService = null;
  const params: PageableParam = {
    page: this.commissionPage,
    size: this.commissionSize,
    searchParam: this.commissionSearch || undefined,
  };
  this.barService.findServiceCommissionPage(params).subscribe({
    next: (res) => {
      this.serviceCommissions = res.data ?? [];
      this.commissionTotalPages = res.totalPages ?? 0;
      this.commissionTotalElements = res.totalElements ?? 0;
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Error fetching service commissions:', err),
  });
}

onCommissionSearch(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  clearTimeout(this.commissionSearchTimer);
  this.commissionSearchTimer = setTimeout(() => {
    this.commissionSearch = value.trim();
    this.commissionPage = 0;
    this.findCommissionPage();
  }, 300);
}

changeCommissionPage(page: number) {
  if (page < 0 || page >= this.commissionTotalPages) {
    return;
  }
  this.commissionPage = page;
  this.findCommissionPage();
}

openSplitEditor(row: any) {
  this.editingService = row;
  this.splitDraft = {};
  for (const bucket of this.commissionBuckets) {
    this.splitDraft[bucket.key] = Number(row[bucket.key]) || 0;
  }
  this.cdr.detectChanges();
  // The editor sits above the list; bring it into view from a row far down.
  document.querySelector('.split-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

closeSplitEditor() {
  this.editingService = null;
  this.cdr.detectChanges();
}

get draftTotal(): number {
  return this.commissionBuckets.reduce((sum, b) => sum + (Number(this.splitDraft[b.key]) || 0), 0);
}

/** Tshs a percentage of the selling price comes to, on one unit. */
bucketAmount(percent: number): number {
  const price = Number(this.editingService?.price) || 0;
  return (price * (Number(percent) || 0)) / 100;
}

saveCommission() {
  if (!this.editingService || this.savingCommission) {
    return;
  }
  const bad = this.commissionBuckets.some(b => {
    const v = Number(this.splitDraft[b.key]) || 0;
    return v < 0 || v > 100 || !Number.isInteger(v);
  });
  if (bad) {
    this.alertService.show('error', this.translate.instant('COMMISSION_FORM.WHOLE_NUMBERS'));
    return;
  }
  if (this.draftTotal > 100) {
    this.alertService.show('error', this.translate.instant('COMMISSION_FORM.OVER_100', { total: this.draftTotal }));
    return;
  }

  const dto: CommissionDTO = {
    uid: this.editingService.commissionUid || undefined,
    barServiceUID: this.editingService.serviceUid,
  };
  for (const bucket of this.commissionBuckets) {
    (dto as any)[bucket.key] = Number(this.splitDraft[bucket.key]) || 0;
  }

  this.savingCommission = true;
  this.barService.saveCommissions(dto).subscribe({
    next: (res) => {
      this.savingCommission = false;
      if (res?.data) {
        this.alertService.show('success', this.translate.instant('COMMISSION_FORM.SAVED', { name: this.editingService.serviceName }));
        this.findCommissionPage();
      }
    },
    error: (err) => {
      this.savingCommission = false;
      console.error('Error saving commission:', err);
    },
  });
}

deleteCommission(row: any) {
  const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
    width: '420px',
    maxWidth: '95vw',
    disableClose: true,
    data: { itemName: row.serviceName },
  });
  dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (!confirmed) {
      return;
    }
    this.barService.deleteCommission(row.commissionUid).subscribe({
      next: () => {
        this.alertService.show('success', this.translate.instant('COMMISSION_FORM.DELETED'));
        this.findCommissionPage();
      },
      error: (err) => console.error('Error deleting commission:', err),
    });
  });
}



   /****
    * ************************************************************************** BILL CODES *****************************************************************
    * The names bills are opened under. A code is taken while an unpaid bill
    * holds it, and cannot be deleted until that bill is paid.
    */

billCodes: { uid: string; code: string; inUse: boolean }[] = [];
newBillCode = '';
savingBillCode = false;

loadBillCodes() {
  this.barService.findBillCodes().subscribe({
    next: (res) => {
      this.billCodes = res.data ?? [];
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Error loading bill codes:', err),
  });
}

addBillCode() {
  const code = this.newBillCode.trim().toUpperCase();
  if (!code || this.savingBillCode) {
    return;
  }
  this.savingBillCode = true;
  this.barService.saveBillCode(code).subscribe({
    next: (res) => {
      this.savingBillCode = false;
      if (res?.data) {
        this.newBillCode = '';
        this.alertService.show('success', this.translate.instant('BILL_CODES.SAVED', { code }));
        this.loadBillCodes();
      }
    },
    error: (err) => {
      this.savingBillCode = false;
      console.error('Error saving bill code:', err);
    },
  });
}

removeBillCode(row: { uid: string; code: string; inUse: boolean }) {
  if (row.inUse) {
    return;
  }
  const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
    width: '420px',
    maxWidth: '95vw',
    disableClose: true,
    data: { itemName: row.code },
  });
  dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (!confirmed) {
      return;
    }
    this.barService.deleteBillCode(row.uid).subscribe({
      next: (res) => {
        if (res?.data) {
          this.alertService.show('success', this.translate.instant('BILL_CODES.DELETED', { code: row.code }));
          this.loadBillCodes();
        }
      },
      error: (err) => console.error('Error deleting bill code:', err),
    });
  });
}

userDataSource: UserTableData[] = [];findUserPageByBranch() {

  const params: PageableParam = {
    page: this.page,
    size: this.size
  };

  this.barService.findUserPageByBranch(params).subscribe({

    next: (res) => {

      if (res.data) {

        this.userDataSource = res.data.map((user: any): UserTableData => ({

          uid: user.uid,

          username: user.username || '--',

          firstName: user.firstName,

          lastName: user.lastName,

          fullName: [
            user.firstName,
            user.middleName,
            user.lastName
          ]
            .filter(Boolean)
            .join(' ') || '--',

          roleName: user.roles?.[0]?.name || '--',

          branchName: user.branch?.branchName || '--',

          isBlocked: user.isBlocked === true

        }));

        this.totalElements = res.totalElements;
        this.totalPages = res.totalPages;

        this.page = res.currentPage;
        this.size = res.size;

        this.cdr.detectChanges();

        console.log('User Table Data:', this.userDataSource);
      }

    },

    error: (err) => {
      console.error('Error fetching users:', err);
    }

  });
}

addUser(): void {

  // The roles have to be in hand before the dialog opens: the role is
  // chosen while registering, not in a second step afterwards, and only
  // the ones this viewer is allowed to grant are offered.
  this.userService.findRoleByBranch().subscribe({

    next: (roleRes) => {
      const assignableRoleNames = this.getAssignableRoleNames();
      const roles = (roleRes.data || []).filter((role: any) =>
        assignableRoleNames.includes(role.name)
      );
      this.openAddUserDialog(roles);
    },

    error: () => {
      // Without the list the dialog would ask for a role it cannot offer,
      // so let it through without one and fall back to Assign role.
      this.openAddUserDialog([]);
    },
  });
}

private openAddUserDialog(roles: any[]): void {

  const dialogRef = this.dialog.open(SelectStaffDialogComponent, {
    width: '560px',
    maxWidth: '95vw',
    data: { roles },
  });

  dialogRef.afterClosed().subscribe((staff) => {

    if (!staff) {
      return;
    }

    const userDTO: UserDTO = {
      firstName: staff.firstName,
      middleName: staff.middleName,
      lastName: staff.lastName,
      gender: staff.gender,
      dob: staff.dateOfBirth,
      phone: staff.phoneNumber,
      email: staff.email,
      address: staff.address,
      role: staff.role,
      branch: this.visibility.getBranchUID(),
    };

    this.userService.saveUser(userDTO).subscribe({

      next: (res) => {
        if (res.data) {
          this.alertService.show('success', 'User Added');
          this.showActivationCode(res.data, staff.phoneNumber);
          this.findUserPageByBranch();
          this.cdr.markForCheck();
        }
      },

      error: (err) => {
        this.alertService.show('error', err?.error?.message || 'Failed to add user');
      }
    });
  });
}

roles: any[] = [];
userRoles: any[] = [];
selectedRoleUIDs: string[] = [];

// What roles the currently logged-in user is allowed to grant, based on
// their own role. ROOT can assign anything; everyone else can only hand
// out roles below their own rank.

/**
 * Shows the one-time code to whoever just registered someone, so the person
 * standing at the counter can sign in straight away instead of waiting on a
 * text. It is the only moment the code is readable - it is stored hashed.
 */
private showActivationCode(data: any, phone?: string): void {

  if (!data?.activationCode) {
    return;
  }

  this.dialog.open(ActivationCodeDialogComponent, {
    width: '420px',
    maxWidth: '95vw',
    disableClose: true,
    data: {
      username: data.user?.username ?? '',
      activationCode: data.activationCode,
      validHours: data.validHours ?? 72,
      phone,
    },
  });
}

private getAssignableRoleNames(): string[] {

  if (this.visibility.hasRole('ROOT')) {
    return ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER'];
  }
  if (this.visibility.hasRole('DIRECTOR')) {
    return ['STAFF', 'MANAGER', 'CEO', 'CASHIER'];
  }
  if (this.visibility.hasRole('CEO')) {
    return ['CASHIER', 'MANAGER'];
  }
  if (this.visibility.hasRole('STAFF')) {
    return ['CEO', 'CASHIER', 'MANAGER'];
  }

  return [];
}

/** Which row is mid-request, so its button cannot be pressed twice. */
blockingUid: string | null = null;

/**
 * Revokes a branch user's access, or gives it back.
 *
 * Deliberately not a delete. Their uid is what branches.created_by, the
 * commission payouts and the subscription payments all point at - removing
 * the row would orphan every one of those and quietly change what people
 * are owed. This stops the login and leaves the history standing, which is
 * what "they no longer work here" actually means.
 */
onToggleAccess(user: UserTableData): void {

  if (this.blockingUid) {
    return;
  }

  const revoking = !user.isBlocked;

  this.dialog.open(ComfirmDialogComponent, {
    width: '440px',
    maxWidth: '95vw',
    data: {
      title: this.translate.instant(
        revoking ? 'SETTING_PAGE.REVOKE_TITLE' : 'SETTING_PAGE.RESTORE_TITLE'),
      message: this.translate.instant(
        revoking ? 'SETTING_PAGE.REVOKE_MESSAGE' : 'SETTING_PAGE.RESTORE_MESSAGE',
        { name: user.fullName }),
      confirmLabel: this.translate.instant(
        revoking ? 'SETTING_PAGE.BTN_REVOKE_USER' : 'SETTING_PAGE.BTN_RESTORE_USER'),
    },
  }).afterClosed().subscribe(confirmed => {

    if (!confirmed) {
      return;
    }

    this.blockingUid = user.uid;

    this.barService.setUserBlocked(user.uid, revoking).subscribe({

      next: (res) => {
        this.blockingUid = null;
        const outcome = res?.data;

        if (outcome === 'BLOCKED' || outcome === 'RESTORED') {
          // Changed in place: refetching the page would only make it blink.
          user.isBlocked = revoking;
          this.alertService.show('success', this.translate.instant(
            revoking ? 'SETTING_PAGE.REVOKED' : 'SETTING_PAGE.RESTORED'));
        } else {
          this.alertService.show('warning', this.accessMessage(outcome));
        }
        this.cdr.markForCheck();
      },

      error: () => {
        this.blockingUid = null;
        this.alertService.show('error', this.translate.instant('SETTING_PAGE.ACCESS_FAILED'));
        this.cdr.markForCheck();
      },
    });
  });
}

private accessMessage(code: string | undefined): string {
  const known: Record<string, string> = {
    NOT_YOURSELF: 'SETTING_PAGE.NOT_YOURSELF',
    NOT_ROOT: 'SETTING_PAGE.NOT_ROOT',
    NOT_FOUND: 'SETTING_PAGE.USER_NOT_FOUND',
    MISSING_DATA: 'SETTING_PAGE.ACCESS_FAILED',
  };
  return this.translate.instant(known[code ?? ''] ?? 'SETTING_PAGE.ACCESS_FAILED');
}

/**
 * Opens the role dialog. Its old name promised a view, and the button said
 * so - but nothing here views anything. It loads the roles this branch may
 * grant and asks which of them this person holds.
 */
onAssignRole(user: UserTableData): void {

  this.userService.findUserByUID(user.uid).subscribe({

    next: (userRes) => {

      this.userRoles = Array.isArray(userRes.data)
        ? userRes.data
        : [userRes.data];

      const currentRoleUIDs = this.userRoles
        .map((userRole: any) => userRole?.roleUID)
        .filter(Boolean);

      this.userService.findRoleByBranch().subscribe({

        next: (roleRes) => {

          const assignableRoleNames = this.getAssignableRoleNames();
          const allRoles = roleRes.data || [];

          // Only offer roles the viewer is allowed to grant - but never
          // hide a role the user already has, otherwise saving would
          // silently strip a role the viewer isn't even allowed to touch.
          this.roles = allRoles.filter((role: any) =>
            assignableRoleNames.includes(role.name) ||
            currentRoleUIDs.includes(role.uid)
          );

          this.selectedRoleUIDs = this.roles
            .filter((role: any) => currentRoleUIDs.includes(role.uid))
            .map((role: any) => role.uid);

          this.openRoleDialog(user);

          this.cdr.markForCheck();
        },

        error: (err) => {
          console.error('Error fetching roles:', err);
        }
      });

      this.cdr.markForCheck();
    },

    error: (err) => {
      console.error('Error fetching user roles:', err);
    }
  });
}

openRoleDialog(user: UserTableData): void {

  const dialogRef = this.dialog.open(UserRoleDialogComponent, {
    width: '500px',
    maxWidth: '95vw',
    autoFocus: false,

    data: {
      user: user,
      roles: this.roles,
      selectedRoleUIDs: [...this.selectedRoleUIDs]
    }
  });

  dialogRef.afterClosed().subscribe(result => {

    if (result) {

      const assignUserRoleDTO: AssignUserRoleDTO = {
        userUID: result.userUID,
        roleUIDS: result.roleUIDs
      };

      this.userService.assignOrUnAssignUserRole(assignUserRoleDTO).subscribe({

        next: (res) => {
          if (res.data) {
            this.alertService.show('success', 'Role Assigned');
            this.findUserPageByBranch();
            this.cdr.markForCheck();
          }
        },

        error: (err) => {
          this.alertService.show('error', err?.error?.message || 'Failed to update role');
        }
      });
    }
  });
}

}
