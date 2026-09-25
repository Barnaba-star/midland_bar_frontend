import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  load<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }

  clear(key: string) {
    localStorage.removeItem(key);
  }

  has(key: string): boolean {
  return localStorage.getItem(key) !== null;
 }

}

