import { localDate } from './local-date';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { debounceTime, map, Observable, distinctUntilChanged, tap, switchMap, finalize } from 'rxjs';
import { FieldOption, FormField } from '../models/form-field';


@Injectable({
  providedIn: 'root',
})
export class HelpersMethodService {
  setupAsyncSearchFields(leaveFormFields: FormField[]) {
    throw new Error('Method not implemented.');
  }
  constructor(private http: HttpClient) {}

  getDropDownOptions<T>(endpoint: string, mapFn: (item: T) => FieldOption): Observable<FieldOption[]> {
    return this.http.get<{ data: T[] }>(endpoint).pipe(map((response) => response.data.map(mapFn)));
  }

  getCheckboxOptions<T>(
    endpoint: string,
    mapFn: (item: T) => { label: string; value: any; checked: boolean }
  ): Observable<{ label: string; value: any; checked: boolean }[]> {
    return this.http
      .get<{ data: T[] }>(endpoint)
      .pipe(map((response) => response.data.map(mapFn)));
  }

  getCheckboxOptionsVersionTwo<T>(
    endpoint: string,
    mapFn: (item: T) => { label: string; value: any; checked: boolean }
  ): Observable<{ label: string; value: any; checked: boolean }[]> {
    return this.http.get<any>(endpoint).pipe(
      map((response) => {
        if (Array.isArray(response.data)) {
          return response.data.map(mapFn);
        } else {
          return [];
        }
      })
    );
  }

  getTabs<T>( endpoint: string, mapFn: (item: T) => { label: string; content: string }
  ): Observable<{ label: string; content: string }[]> {
    return this.http.get<T[]>(endpoint).pipe(map((data) => data.map(mapFn)));
  }

  getEnumOptions(e: any): FieldOption[] {
    return Object.keys(e).map((key) => ({
      label: this.capitalizeFirstLetter(key.toLowerCase()),
      value: e[key],
    }));
  }

  capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }


createSearchFn(options: FieldOption[], delayMs: number = 0): (input: string) => Observable<FieldOption[]> {
  return (input: string): Observable<FieldOption[]> => {
    return new Observable<FieldOption[]>((observer) => {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(input.toLowerCase())
      );
      setTimeout(() => {
        observer.next(filtered);
        observer.complete();
      }, delayMs);
    });
  };
}

ssetupAsyncSearchFields(fields: FormField[]) {
  fields
    .filter(f => f.type === 'autocomplete-async' && f.asyncSearch && f.search$ && f.endpoint && f.mapFn)
    .forEach(field => {
      field.searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          tap(() => field.loading = true),
          switchMap(term =>
            
            this.getDropDownOptions(
              `${field.endpoint}?keyword=${term}`,
              field.mapFn ?? ((item: any) => ({ label: String(item), value: item, checked: false }))
            )
              .pipe(finalize(() => field.loading = false))
          )
        )
       .subscribe((options: FieldOption[]) => {
console.log('Searching with term:', options);
  field.filteredOptions$?.next(options);
});

    });
}

private formatDateToBackend(date: Date): string {
  if (!(date instanceof Date)) return '';
  return localDate(date); 
}

enumToOptions(enumObj: any): FieldOption[] {
    return Object.keys(enumObj).map(key => ({
      label: key,
      value: enumObj[key]
    }));
  }


testingMethods(){
  const name:Date = new Date();
  console.log("Date", name)
}

formatNumberToCurrency(value: number): string {
  return value.toLocaleString('sw-TZ'); 
}

}


