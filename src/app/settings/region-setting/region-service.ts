import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response, ResponseList } from '../../Utils/models/responces';

export interface Region {
  uid?: string;
  name: string;
  code: string;
}

@Injectable({ providedIn: 'root' })
export class RegionService {

  private readonly regionUrl = `${environment.baseApiUrl}/region`;

  constructor(private http: HttpClient) {}

  findRegions(): Observable<ResponseList<Region>> {
    return this.http.get<ResponseList<Region>>(`${this.regionUrl}/findRegions`);
  }

  /**
   * One endpoint for both: without a uid the backend creates, with a uid it
   * edits. A refusal still comes back as HTTP 200 - `data` is null and the
   * reason is in `message`, so callers check `data`, not the status.
   */
  saveRegion(region: Region): Observable<Response<Region>> {
    return this.http.post<Response<Region>>(`${this.regionUrl}/saveRegion`, region);
  }

  deleteRegion(uid: string): Observable<Response<Region>> {
    return this.http.post<Response<Region>>(`${this.regionUrl}/deleteRegion/${uid}`, {});
  }
}
