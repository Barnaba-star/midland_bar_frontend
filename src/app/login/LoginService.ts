import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Response } from '../Utils/models/responces';
import { environment } from '../Utils/enviroments/environment';
import { DataDTO } from './model';


@Injectable({
  providedIn: 'root'
})
export class LoginService {
constructor(private http:HttpClient){}
  private api = environment.baseApiUrl
  private baseUrl: string = `${this.api}/authentication`;
  private personnelUrl: string = `${this.api}/personnel`;

changePassword(dataDTO:DataDTO):Observable<Response<any>>{
  return this.http.post<Response<any>>(`${this.baseUrl}/changePassword`, dataDTO);
}

findPersonnelByUID(personnelUid: string):Observable<Response<any>>{
  return this.http.get<Response<any>>(`${this.personnelUrl}/findPersonnelByUid/${personnelUid}`);
}

}
