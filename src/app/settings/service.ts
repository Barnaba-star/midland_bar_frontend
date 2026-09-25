import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../Utils/enviroments/environment';
import { Observable } from 'rxjs/internal/Observable';
import { Response, ResponseList } from '../Utils/models/responces';

@Injectable({
  providedIn: 'root',
})
export class Service {

    constructor(private http:HttpClient){}
    private baseURL = environment.baseApiUrl
    private attachmentUrl = `${this.baseURL}/attachment`
    private branchUrl: string = `${this.baseURL}/branch`;
    private roleURL: string = `${this.baseURL}/role`;
    private settingURL: string = `${this.baseURL}/setting`;

    getTableSizes():Observable<Response<any>>{
      return this.http.get<Response<any>>(`${this.settingURL}/getTableSizes`)
    }

    findOnlineUsers():Observable<ResponseList<any>>{
      return this.http.get<ResponseList<any>>(`${this.settingURL}/findOnlineUsers`)
    }

    updateSubscription(payload: { mobileNetwork: string; phoneNumber: string; months: number }):Observable<Response<any>>{
      return this.http.post<Response<any>>(`${this.settingURL}/updateSubscription`, payload)
    }

    /**
     * Paying from the login screen, where there is no token yet. The
     * credentials go with the request because the caller has none; the
     * backend re-checks them exactly as a login would.
     */
    payExpiredSubscription(payload: { username: string; password: string; mobileNetwork: string; phoneNumber: string; months: number }):Observable<Response<any>>{
      return this.http.post<Response<any>>(`${this.baseURL}/authentication/paySubscription`, payload)
    }

}
