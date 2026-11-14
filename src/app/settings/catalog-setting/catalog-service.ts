import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Utils/enviroments/environment';
import { Response, ResponseList } from '../../Utils/models/responces';

/** A drink the main office describes once for every branch (owner, 2026-11-14). */
export interface CatalogItem {
  uid?: string;
  name: string;
  flavour?: string | null;
  size?: string | null;
  category?: string;
  unit?: string | null;
  packUnit?: string | null;
  unitsPerPack?: number | null;
  barcode?: string | null;
  packBarcode?: string | null;
}

/** The same drink as one branch sees it, with its prices there if it sells it. */
export interface BranchCatalogItem extends CatalogItem {
  uid: string;
  displayName: string;
  added: boolean;
  serviceUid?: string | null;
  price?: number | null;
  buyingPrice?: number | null;
}

export interface CatalogPick {
  catalogUid: string;
  price: number;
  buyingPrice: number;
}

export interface CatalogPickResult {
  catalogUid: string;
  name?: string;
  ok: boolean;
  updated?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly url = `${environment.baseApiUrl}/catalog`;

  constructor(private http: HttpClient) {}

  items(): Observable<ResponseList<CatalogItem>> {
    return this.http.get<ResponseList<CatalogItem>>(`${this.url}/items`);
  }

  save(item: CatalogItem): Observable<Response<CatalogItem>> {
    return this.http.post<Response<CatalogItem>>(`${this.url}/save`, item);
  }

  remove(uid: string): Observable<Response<CatalogItem>> {
    return this.http.post<Response<CatalogItem>>(`${this.url}/delete/${uid}`, {});
  }

  forBranch(): Observable<ResponseList<BranchCatalogItem>> {
    return this.http.get<ResponseList<BranchCatalogItem>>(`${this.url}/forBranch`);
  }

  addToBranch(items: CatalogPick[]): Observable<ResponseList<CatalogPickResult>> {
    return this.http.post<ResponseList<CatalogPickResult>>(`${this.url}/addToBranch`, { items });
  }
}
