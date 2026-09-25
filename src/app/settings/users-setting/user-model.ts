import { Branch } from "../node-setting/NodeModel";
import { Role } from "../role-setting/RoleModel";

export interface User {
  uid?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: number;
  gender?: string;
  dob?: Date | string;
  address?: string;
  role?: Role;
  branch?: Branch;
  middleName?:string;
}

export interface UserDTO {
  uid?: string;
  firstName?: string;
  lastName?: string;
  middleName?:string;
  email?: string;
  phone?: number | string;
  gender?: string;
  dob?: Date | string;
  address?: string;
  profileImage?:File;
  role?: String;
  branch?: String;
}

export interface ProfilePicDTO {
  uid?: string;
  imageName?: string;
  path?: string;
  type?: string;
}

export interface UserAndAttachmentDTO {
  uid?: string;
  profilePicDTO?: ProfilePicDTO;
  userDTO?: UserDTO;
}

export interface AssignUserRoleDTO {
  userUID?: string;
  roleUIDS?: string[];
}


