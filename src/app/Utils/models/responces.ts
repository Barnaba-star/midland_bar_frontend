export interface Response<T> {
 data: T;
 message?: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface ResponsePage<T> {
  data: T[];
  message?: string;
  status?: string;
  totalElements: number;
  totalPages: number;
  size: number;
  currentPage: number;
  first: boolean;
  last: boolean;
}


export enum ResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
  first: boolean;
  last: boolean;
}

export interface ResponseList<T> {
  data?: T[];
  message?: string;
}

export interface SideNavItems {
  label: string;
  icon?: string;
  route?: string;
  action?: string;
}

export interface TableColumn {
  header: string;
  field: string;
  accessor?: (row: any) => any;
}
export interface PageableParam {
  searchParam?: string;
  filter?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
  date?:Date;
}
