import { Injectable } from '@angular/core';
import { environment } from '../../Utils/enviroments/environment';
import { PageableParam, Response, ResponseList, ResponsePage } from '../../Utils/models/responces';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RoleDTO } from './RoleModel';
@Injectable({
  providedIn: 'root',
})
export class RoleService {
    constructor(private http:HttpClient){}
    private api = environment.baseApiUrl
    private baseUrl: string = `${this.api}/role`;

saveRole(roleDTO: RoleDTO):Observable<Response<any>>{
return this.http.post<Response<any>>(`${this.baseUrl}/saveRole`, roleDTO);
}

findRolePage(param:PageableParam):Observable<ResponsePage<any>>{
  return this.http.post<ResponsePage<any>>(`${this.baseUrl}/findRolePage`, param)
}

deleteRole(roleUID:string):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.baseUrl}/deleteRole/${roleUID}`, null)
}
findRoleAndPermission(roleUID:string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.baseUrl}/findRoleAndPermission/${roleUID}`)
}

findRoleByBranch():Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(`${this.baseUrl}/findRoleByBranch`);
}
}
