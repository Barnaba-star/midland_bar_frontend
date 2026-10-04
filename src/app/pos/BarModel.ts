
export interface BarStaffDTO{
  uid?: string;
  /** K1, A2... - blank gives the next number (001, 002...). */
  staffCode?: string;
  firstName?: string;
  middleName?:string;
  lastName?:string;
  dateOfBirth?:Date;
  phoneNumber?: string;
  barServiceUID?:string[];
  barCategory?:string;
  description?:string;
  gender?:string;
}
export interface BarStaffEntity{
  uid?: string;
  /** Typed at Staff Sell - 001, 002... */
  staffCode?: string;
  firstName?: string;
  middleName?:string;
  lastName?:string;
  dateOfBirth?:Date;
  phoneNumber?: string;
  barCategory?:string;
  description?:string;
  gender?:string;
  /** Roles of the staff member's login (Manage Staff only); empty = plain staff. */
  roles?: string[];
}
export interface BarServiceDTO{
  uid? : string;
  serviceName?:string;
  serviceCode?: string;
  status?: string;
  description?:string;
  commissionType?:string;
  commissionValue?:number;
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
  price?:number;
  usageType?:string;
}

export interface BarServiceData{
  uid? : string;
  serviceName?:string;
  serviceCode?: string;
  status?: string;
  description?:string;
  commissionType?:string;
  commissionValue?:number;
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
  price?:number;
  usageType?:string;
}
export interface CommissionDTO{
    uid?: number;
    barServiceUID?: string;
    staffPercent?:number;
    ownerPercent?:number;
    traPercent?:number;
    emergencyPercent?:number;
    totalPercent?:number;
    maintenancePercent?:number;
    otherPercent?:number;
    rentPercent?:number;
    loanPercent?:number;
    waterPercent?:number;
    lukuPercent?:number;
    stockPurchasePercent?:number;
}
export interface BarBookingDTO{
   uid?:string;
   customerName?:string;
   bookingDate?:Date;
   totalAmount?:number;
   amountPaid?:number;
   status?:string;
   servicesUID?:string[];
}

export interface BarSalesDTO{
  uid?:string;
  barStaffUID?:string;
  barServiceUID?:string[];
  paymentMethod?:string;
  salesOpenedUID?:string;
}

export interface BarServiceEntity{
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
}
export interface SaleOpenedDTO {
     uid?: string;
    salesCode?: string;
    paymentMethod?: string;
    paidAmount?:number;
    paymentStatus?:string;
    bill?:number;
}
export interface SalesOpened{
    uid?: string;
    salesCode?: string;
    /** Set on bills opened at Staff Sell - whose bill it is. */
    staffUid?: string;
    staffName?: string;
    staffCode?: string;
    paymentMethod?: string;
    paidAmount?:number;
    paymentStatus?:string;
    bill?:number;
}

export interface StaffCommissionDTO {
   /** How it was paid out: cash, mpesa, tigopesa, airtelmoney, halopesa or bank. */
   method?: string;
     uid?:string;
     amount?: number;
     filterDate?:string;
     remainingAmount?:number;
     firstName?:string;
     middleName?:string;
     lastName?:string;
     filter?:string;
     weekDate?:string;
     descriptions?:string;
}

export interface StoreDTO {
    uid?: string;
    nameOfStore?:string;
    codeOfStore?:string;
    quantity?:number;
    barServiceEntityUID?:string;
    description?:string;
    openedDate?:string;
    closedDate?:string;
    status?:string;
    buyingPrice?:number;
    totalQuantityPrice?:number;
    usedQuantity?:number;
    notUsedQuantity?:number;
    openStoreUID?:string;
}
export interface Store {
    uid?: string;
    nameOfStore?:string;
    codeOfStore?:string;
    quantity?:number;
    description?:string;
    nameOfService?:string;
    codeOfService?:string;
    openedDate?:string;
    closedDate?:string;
    status?:string;
    buyingPrice?:number;
    totalQuantityPrice?:number;
    usedQuantity?:number;
    notUsedQuantity?:number;
    openedQuantity?:number;
    openStoreUID?:string;
}
export interface UserTableData {
  uid: string;
  username: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  roleName: string;
  branchName: string;
  /** True when their access has been revoked - they stay listed, they just
   *  cannot sign in. */
  isBlocked: boolean;
}

export interface SpendDTO {
   /** How it was paid out: cash, mpesa, tigopesa, airtelmoney, halopesa or bank. */
   method?: string;
   uid?: string;
   incomeExpensesUID?:string;
   amount?:number;
   description?:string;
}
export interface PayStockAndPurchaseDTO {
   /** How it was paid out: cash, mpesa, tigopesa, airtelmoney, halopesa or bank. */
   method?: string;
   uid?: string;
   amount?:number;
   description?:string;
   weekDate:Date;
}

/** One delivery into the store. packs x unitsPerPack + looseUnits is what the count goes up by. */
export interface StockReceiptDTO {
  barServiceUID: string;
  packs?: number;
  looseUnits?: number;
  /** Price of one pack on this delivery (one unit, with no pack). */
  packPrice?: number;
  supplier?: string;
  note?: string;
}

/** The staff member behind a Staff Sell code. */
export interface StaffSellStaff {
    uid: string;
    staffCode: string;
    name: string;
    category?: string;
}

/** One staff member's day on the Sales page. Null staffCode = bills opened on the Sales page itself. */
export interface StaffSalesRow {
    staffCode: string | null;
    staffName: string | null;
    total: number;
    paidBills: number;
    byMethod: Record<string, number>;
    openBills: number;
    openAmount: number;
}

/** What a staff member wrote at Staff Sell, waiting on the supervisor. */
export interface StaffOrder {
    uid: string;
    salesOpenedUid: string;
    salesCode: string;
    staffUid: string;
    staffCode: string;
    staffName: string;
    /** DRAFT (still writing), SENT (with the supervisor), RECEIVED, REJECTED. */
    status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'REJECTED';
    sentAt?: string;
    decidedAt?: string;
    decidedBy?: string;
    rejectReason?: string;
    lines: StaffOrderLine[];
}

export interface StaffOrderLine {
    uid: string;
    barServiceUid: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
}
