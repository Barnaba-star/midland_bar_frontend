import { Injectable } from '@angular/core';
import { environment } from '../../Utils/enviroments/environment';
import { PageableParam, Response, ResponseList, ResponsePage } from '../../Utils/models/responces';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AssignPermissionToRoleDto } from './permission-model';


@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  constructor(private http:HttpClient){}
    private api = environment.baseApiUrl
    private roleUrl: string = `${this.api}/role`;

findPermissionsByRole(role:String):Observable<ResponseList<any>>{
  return this.http.get<ResponseList<any>>(`${this.roleUrl}/findPermissionsByRole/${role}`)
}

findRoles():Observable<ResponseList<any>>{
return this.http.get<ResponseList<any>>(`${this.roleUrl}/findRoles`)
}

findDistinctModules():Observable<ResponseList<any>>{
return this.http.get<ResponseList<any>>(`${this.roleUrl}/findDistinctModules`)
}

findPermissionByRoleUID(roleUID: string): Observable<ResponseList<any>> {
  return this.http.get<ResponseList<any>>(
    `${this.roleUrl}/findPermissionsByRole/${roleUID}`
  );
}

findPermissionByModuleName(moduleName:String):Observable<ResponseList<any>>{
return this.http.get<ResponseList<any>>(`${this.roleUrl}/findPermissionByModuleName/${moduleName}`)
}

assignPermissionToRole(assignPermissionToRole:AssignPermissionToRoleDto):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.roleUrl}/assignPermissionToRole`, assignPermissionToRole)
}

}
