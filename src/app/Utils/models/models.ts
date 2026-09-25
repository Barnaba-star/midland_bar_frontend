export interface SubMenuItem {
  label: string;
  icon: string;
}

export interface MenuItem {
  label: string;
  icon: string;
  submenu?: SubMenuItem[];  // optional
}
export interface TableColumn {
  field: string;
  header?: string;

  icon?: string;
  iconPosition?: 'left' | 'right';
  iconColor?: string;

  cellColors?: {
    [value: string]: {
      background: string;
      color: string;
    };
  };
}
export interface DeleteConfirmationData {
  title?: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
}
