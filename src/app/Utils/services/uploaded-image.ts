import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, from, of, shareReplay, switchMap } from 'rxjs';
import { environment } from '../enviroments/environment';
import { silent } from '../inteceptor/silent-request';

/**
 * Pictures the backend keeps under /uploads (profile photos, branch logos).
 *
 * A plain <img src> sends no Authorization header, only cookies - and in
 * production the login cookie belongs to the frontend's domain, never the
 * backend's, so the picture came back 401. Fetched through HttpClient instead,
 * it carries the token like every other request, and is handed back as a data
 * URL: one that works in an <img>, and in the receipt's print frame too.
 */
@Injectable({ providedIn: 'root' })
export class UploadedImageService {
  private cache = new Map<string, Observable<string | null>>();

  constructor(private http: HttpClient) {}

  /** The picture as a data URL, or null if there is none or it cannot be had. */
  load(name: string | null | undefined): Observable<string | null> {
    if (!name) {
      return of(null);
    }
    let image = this.cache.get(name);
    if (!image) {
      image = this.http
        .get(`${environment.baseApiUrl}/uploads/${name}`, { responseType: 'blob', context: silent() })
        .pipe(
          switchMap((blob) => from(toDataUrl(blob))),
          catchError(() => {
            // Not cached as missing: it may be there once we are back online.
            this.cache.delete(name);
            return of(null);
          }),
          shareReplay(1),
        );
      this.cache.set(name, image);
    }
    return image;
  }
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
