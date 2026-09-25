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

findBranchList():Observable<ResponseList<any>>{
 return this.http.get<ResponseList<any>>(`${this.baseUrl}/findBranchList`)
}

findAllUsersWithBranchAndRoles(branchUID:string):Observable<ResponseList<any>>{
 return this.http.get<ResponseList<any>>(`${this.baseUrl}/findAllUsersWithBranchAndRoles/${branchUID}`)
}

}
