export interface StaffCommission {
  staffUid: string;
  staffName?: string;
  username?: string;

  // every branch this staff member has ever registered
  branchesRegistered: number;

  // of those, how many paid within the reported month
  branchesPaid: number;

  // a branch can pay more than once in a month
  payments: number;

  totalCollected: number;
  commissionDue: number;

  // already handed over for this month
  commissionPaid: number;

  // due - paid; what the Pay button would hand over right now
  outstanding: number;

  lastPaidAt?: string;
}

export interface CommissionPayout {
  uid?: string;
  staffUid?: string;
  staffName?: string;
  periodYear?: number;
  periodMonth?: number;
  amount?: number;
  paidAt?: string;
  paidByName?: string;
  note?: string;
}

export interface SubscriptionPayment {
  uid?: string;
  reference?: string;
  branchUid?: string;
  branchName?: string;
  branchCode?: string;
  staffUid?: string;
  staffName?: string;
  amount?: number;
  months?: number;
  paidAt?: string;
  commissionPercent?: number;
  commissionAmount?: number;
}

/**
 * One branch a staff member registered, seen through a single month. The
 * unpaid ones matter most here - the report totals can only show what came
 * in, so this is what tells you which branches to go and chase.
 */
export interface StaffBranch {
  branchUid: string;
  branchName?: string;
  branchCode?: string;
  region?: string;
  registeredAt?: string;

  // explains WHY a branch did not pay: ACTIVE, FREE, EXPIRED, PENDING...
  subscriptionStatus?: string;
  closeSubscription?: string;

  paid: boolean;
  payments: number;
  amountPaid: number;
  commission: number;
  lastPaidAt?: string;

  // branch was deleted but its payments this month still count
  deleted?: boolean;
}
