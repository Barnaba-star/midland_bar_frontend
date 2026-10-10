export interface SidenavItem {
label: string;
icon: string;
route?: string; // router navigation
action?: () => void; // custom action
children?: SidenavItem[]; // submenu
roles?: string[];
/** Shown only to holders of one of these permissions (ROOT always passes). */
permissions?: string[];
}
