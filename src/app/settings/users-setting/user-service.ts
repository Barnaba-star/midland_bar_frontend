import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../Utils/enviroments/environment';
import { Observable } from 'rxjs/internal/Observable';
import { PageableParam, Response, ResponseList, ResponsePage } from '../../Utils/models/responces';
import { silent } from '../../Utils/inteceptor/silent-request';
import { AssignUserRoleDTO, UserAndAttachmentDTO, UserDTO } from './user-model';

/** Where somebody's payroll money is sent. Both parts, or neither. */
export interface BankDetails {
  accountNumber: string | null;
  bankName: string | null;
  /** The name the account is held in, which the bank checks against. */
  accountName: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
    constructor(private http:HttpClient){}
    private baseURL = environment.baseApiUrl
    private attachmentUrl = `${this.baseURL}/attachment`
    private branchUrl: string = `${this.baseURL}/branch`;
    private roleURL: string = `${this.baseURL}/role`;
    private userURL: string = `${this.baseURL}/userSetting`;


saveProfilePic(file:FormData):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.attachmentUrl}/saveAttachment`, file);
}

saveUser(userDTO:UserDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.userURL}/saveUser`, userDTO);
}

/** The caller's own bank details - findUserByUID needs VIEW_USER. */
findMyBankDetails():Observable<Response<BankDetails>>{
  return this.http.get<Response<BankDetails>>(`${this.userURL}/findMyBankDetails`);
}

/**
 * Where this person's payroll money is sent. Anyone may set their own; the
 * backend refuses somebody else's without SAVE_USER.
 */
saveBankDetails(userUID:string, details:BankDetails):Observable<Response<string>>{
  return this.http.post<Response<string>>(`${this.userURL}/saveBankDetails/${userUID}`, details);
}

/** A fresh one-time code by SMS, for an account that has not signed in yet. */
resendActivationCode(userUID:string):Observable<Response<string>>{
  return this.http.post<Response<string>>(`${this.userURL}/resendActivationCode/${userUID}`, {});
}

findBranchList():Observable<ResponseList<any>>{
 return this.http.get<ResponseList<any>>(`${this.branchUrl}/findBranchList`)
}

/** The branches a user works in besides home - main office only. */
findUserBranches(userUID: string): Observable<Response<any>> {
  return this.http.get<Response<any>>(`${this.userURL}/findUserBranches/${userUID}`);
}

saveUserBranches(dto: { userUID: string; branchUIDs: string[] }): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.userURL}/saveUserBranches`, dto);
}

findRoles():Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.roleURL}/findRoles`)
}

findUserProfilePic(userUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.attachmentUrl}/findUserForProfile/${userUID}`)
}

findBranchByUID(branchUID:string):Observable<Response<any>>{
// Header data, re-read on a timer for the subscription badge: no progress bar.
return this.http.get<Response<any>>(`${this.branchUrl}/findBranchByUID/${branchUID}`, { context: silent() });
}

findUserPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.userURL}/findUserPAGE`, params);
}

findUsers(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.userURL}/findUsers`, params);
}

deleteUser(userUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.userURL}/deleteUser/${userUID}`, null)
}

findRoleByBranch():Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.roleURL}/findRoleByBranch`);
}

findUserByUID(userUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.userURL}/findUserByUID/${userUID}`)
}

assignOrUnAssignUserRole(assignUserRoleDTO:AssignUserRoleDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.userURL}/assignOrUnAssignUserRole`, assignUserRoleDTO)
}


}
