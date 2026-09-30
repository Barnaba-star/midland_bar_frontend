import { Routes } from '@angular/router';
import { posFullAccessGuard } from './pos/pos-role.guard';
import { settingsGuard, settingsManageGuard, settingsRootOnlyGuard } from './settings/settings-role.guard';
import { adminGuard, adminManageGuard, adminRootOnlyGuard } from './admin/admin-role.guard';
import { staffSellLockGuard } from './pos/bar-staff-sell/staff-sell-lock';
import { supervisorGuard } from './pos/bar-supervisor/supervisor-role.guard';

export const routes: Routes = [

  {
    path: 'settings',
    canActivate: [staffSellLockGuard, settingsGuard],
    loadComponent: () => import('./settings/settings').then(m => m.Settings),
    children: [

      {
        path: 'users',
        canActivate: [settingsManageGuard],
        loadComponent: () =>import('./settings/users-setting/users-setting').then(m => m.UsersSetting)
      },
       {
        path: 'node',
        loadComponent: () =>import('./settings/node-setting/node-setting').then(m => m.NodeSetting)
      },
      {
        path: 'role',
        canActivate: [settingsManageGuard],
        loadComponent: () =>import('./settings/role-setting/role-setting').then(m => m.RoleSetting)
      },
      {
        path: 'commission',
        loadComponent: () => import('./settings/commission-setting/commission-setting').then(m => m.CommissionSetting)
      },
      {
        path: 'permissions',
        canActivate: [settingsRootOnlyGuard],
        loadComponent: () => import('./settings/permission-setting/permission-setting').then(m => m.PermissionSetting)
      },
       {
        path: 'configuration',
        canActivate: [settingsRootOnlyGuard],
        loadComponent: () => import('./settings/configuration/configuration').then(m => m.Configuration)
      },
       {
        path: 'storage',
        canActivate: [settingsRootOnlyGuard],
        loadComponent: () => import('./settings/storage-setting/storage-setting').then(m => m.StorageSetting)
      },
    ]
  },
  {
    // The third area. Settings is how the system is configured; this is the
    // running of it - what branches are telling us, and what we publish back.
    path: 'admin',
    canActivate: [staffSellLockGuard, adminGuard],
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    children: [
      {
        path: 'messages',
        loadComponent: () => import('./admin/message-admin/message-admin').then(m => m.MessageAdmin)
      },
      {
        path: 'guidance',
        loadComponent: () => import('./admin/guidance-admin/guidance-admin').then(m => m.GuidanceAdmin)
      },
      {
        // Moved here from Settings: watching the platform, not configuring it.
        path: 'errors',
        loadComponent: () => import('./settings/error-setting/error-setting').then(m => m.ErrorSetting)
      },
      {
        path: 'audit',
        loadComponent: () => import('./settings/audit-setting/audit-setting').then(m => m.AuditSetting)
      },
      {
        path: 'expiring',
        loadComponent: () => import('./settings/expiring-setting/expiring-setting').then(m => m.ExpiringSetting)
      },
      {
        // Regions are platform-wide - still ROOT only.
        path: 'regions',
        canActivate: [adminRootOnlyGuard],
        loadComponent: () => import('./settings/region-setting/region-setting').then(m => m.RegionSetting)
      },
      {
        // Money in (subscriptions) - ROOT and DIRECTOR only, not the ADMIN role.
        path: 'payments',
        canActivate: [adminManageGuard],
        loadComponent: () => import('./settings/payment-setting/payment-setting').then(m => m.PaymentSetting)
      },
      {
        // Who gets paid what this month, in the shape it goes to a bank.
        // Same gate as Payments: it is the same money, listed by person.
        path: 'payroll',
        canActivate: [adminManageGuard],
        loadComponent: () => import('./settings/payroll-setting/payroll-setting').then(m => m.PayrollSetting)
      },
    ]
  },
{
  path: '',
  loadComponent: () => import('./landing/landing').then(m => m.Landing)
},
{
  path: 'login',
  loadComponent: () => import('./login/login').then(m => m.Login)
},
{
  path: 'dashboard',
  canActivate: [staffSellLockGuard],
  loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard)
},
{
  // Where orders written at Staff Sell wait until the supervisor receives
  // them - the SUPERVISOR's whole app, and a screen managers can open.
  path: 'supervisor',
  canActivate: [staffSellLockGuard, supervisorGuard],
  loadComponent: () => import('./pos/bar-supervisor/bar-supervisor').then(m => m.BarSupervisor)
},
{
  // A module of its own beside POS, Settings and Admin: a staff member types
  // their code and works their own bills.
  path: 'staff-sell',
  loadComponent: () => import('./pos/bar-staff-sell/bar-staff-sell').then(m => m.BarStaffSell)
},

   {
    path: 'pos',
    canActivate: [staffSellLockGuard],
    loadComponent: () => import('./pos/pos').then(m => m.Pos),
    children: [

      {
        path: 'barSetting',
        canActivate: [posFullAccessGuard],
        loadComponent: () =>import('./pos/bar-setting/bar-setting').then(m => m.BarSetting)
      },
      {
        path: 'barStaff',
        loadComponent:()=>import('./pos/bar-staff/bar-staff').then(m=>m.BarStaff)
      },
       {
        path: 'barService',
        loadComponent:()=>import('./pos/bar-service/bar-service').then(m=>m.BarService)
      },
       {
        path: 'barSales',
        loadComponent:()=>import('./pos/bar-sales/bar-sales').then(m=>m.BarSales)
      },
        {
        path: 'barReports',
        loadComponent:()=>import('./pos/bar-reports/bar-reports').then(m=>m.BarReports)
      },
       {
        path: 'barStore',
        loadComponent:()=>import('./pos/bar-store/bar-store').then(m=>m.BarStore)
      },
      {
        // No guard: raising a question and reading the guidance are open to
        // every POS role.
        path: 'barSupport',
        loadComponent:()=>import('./pos/bar-support/bar-support').then(m=>m.BarSupport)
      },
      {
        path: 'barHelp',
        loadComponent:()=>import('./pos/bar-help/bar-help').then(m=>m.BarHelp)
      },

    ]
  },

];
