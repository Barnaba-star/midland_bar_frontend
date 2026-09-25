import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertSubject = new Subject<{ type: AlertType, message: string }>();
  alertState$ = this.alertSubject.asObservable();

  show(type: AlertType, message: string) {
    this.alertSubject.next({ type, message });
  }
}