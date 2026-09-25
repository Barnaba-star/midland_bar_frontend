export interface Role {
  uid?: string;
  name?: string;
  code?: string;
  category?: string;
  description?: string;
  status?: String;
  createdAt?:Date;
}

export interface RoleDTO {
  uid?: string;
  name?: string;
  code?: string;
  category?: string;
  description?: string;
  status?: String;
  createdAt?:Date;
}
