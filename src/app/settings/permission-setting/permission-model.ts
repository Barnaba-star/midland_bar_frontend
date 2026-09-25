export interface PermissionDTO {
  uid?: string;
  name?: string;
  module?: string;
  group?: string;
}

export interface Permission {
  uid?: string;
  name?: string;
  module?: string;
  group?: string;
}
export interface AssignPermissionToRoleDto {
   roleUID?:string;
   permissions?:Permission[]
}
