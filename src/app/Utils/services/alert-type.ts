import { Injectable } from '@angular/core';

export type FieldOption = { label: string; value: number | string };

@Injectable({
  providedIn: 'root'
})
export class TypeService {

  constructor() { }
}
