export interface Branch{
uid?:string;
branchName?: string;
branchCode?: string;
branchType?: string;
branchCategory?: string;
region?: string;
address?: string;
phone?: string;
status?: string;
description?: string;
openSubscription?: string;
closeSubscription?: string;
subscriptionAmount?: number;
subscriptionDays?: number;
subscriptionStatus?: string;
subscriptionPhoneNumber?: string;
/** Set by the main office: nobody in the branch can sign in or work while true. */
blocked?: boolean;
blockedReason?: string | null;
blockedAt?: string | null;
blockedBy?: string | null;
}
export interface BranchDTO{
uid?:string;
branchName?: string;
branchCode?: string;
branchType?: string;
branchCategory?: string;
region?: string;
address?: string;
phone?: string;
status?: string;
description?: string;
openSubscription?: string;
closeSubscription?: string;
subscriptionAmount?: number;
subscriptionDays?: number;
subscriptionStatus?: string;
subscriptionPhoneNumber?: string;
}
