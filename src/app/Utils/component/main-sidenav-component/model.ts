export interface SidenavItem {
label: string;
icon: string;
route?: string; // router navigation
action?: () => void; // custom action
children?: SidenavItem[]; // submenu
roles?: string[];
}
