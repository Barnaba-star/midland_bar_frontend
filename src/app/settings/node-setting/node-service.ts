import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../Utils/enviroments/environment';
import { PageableParam, Response, ResponseList, ResponsePage } from '../../Utils/models/responces';
import { Observable } from 'rxjs';
import { BranchDTO } from './NodeModel';
@Injectable({
  providedIn: 'root',
})
export class NodeService {
  constructor(private http:HttpClient){}
  private api = environment.baseApiUrl
  private baseUrl: string = `${this.api}/branch`;



saveBranch(branchDTO: BranchDTO):Observable<Response<any>>{
return this.http.post<Response<any>>(`${this.baseUrl}/saveBranch`, branchDTO);
}

saveBranchSubscription(branchDTO: BranchDTO):Observable<Response<any>>{
return this.http.post<Response<any>>(`${this.api}/setting/saveBranchSubscription`, branchDTO);
}

findBranchByUID(branchUID:string):Observable<Response<any>>{
 return this.http.get<Response<any>>(`${this.baseUrl}/findBranchByUID/${branchUID}`)
}

findBranchPage(params: PageableParam): Observable<ResponsePage<any>> {
    return this.http.post<ResponsePage<any>>(`${this.baseUrl}/findBranchPage`, params);
}

deleteBranch(branchUID:string): Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.baseUrl}/deleteBranch/${branchUID}`, null)
}

/**
 * Clears one branch's day-to-day records dated from..to (yyyy-MM-dd, both
 * included); ROOT only. dryRun counts without deleting; the real run needs
 * the branch code typed back. data = rows per table, or null with a code.
 */
purgeBranchPeriod(branchUID: string, body: { from: string; to: string; dryRun: boolean; confirmCode?: string }): Observable<Response<Record<string, number> | null>> {
  return this.http.post<Response<Record<string, number> | null>>(`${this.baseUrl}/purgeBranchPeriod/${branchUID}`, body);
}

/**
 * Blocks or unblocks a branch (BLOCK_BRANCH or ROOT). While blocked nobody in
 * it can sign in or work; nothing is deleted. data = the branch, or null with
 * BRANCH_NOT_FOUND / ROOT_BRANCH.
 */
blockBranch(branchUID: string, body: { blocked: boolean; reason?: string }): Observable<Response<any>> {
  return this.http.post<Response<any>>(`${this.baseUrl}/blockBranch/${branchUID}`, body);
}

findBranchList():Observable<ResponseList<any>>{
 return this.http.get<ResponseList<any>>(`${this.baseUrl}/findBranchList`)
}

findAllUsersWithBranchAndRoles(branchUID:string):Observable<ResponseList<any>>{
 return this.http.get<ResponseList<any>>(`${this.baseUrl}/findAllUsersWithBranchAndRoles/${branchUID}`)
}

}
