import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, startWith, switchMap, catchError, of } from 'rxjs';
import { environment } from '../enviroments/environment';
import { Response } from '../models/responces';
import { Authentication } from './authentication';

export interface AppNotification {
  uid: string;
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, any>;
  icon: string;
  route?: string;
  createdAt: Date;
  read: boolean;
}

interface BackendNotification {
  uid: string;
  titleKey: string;
  messageKey: string;
  paramsJson?: string | null;
  icon?: string | null;
  route?: string | null;
  isRead: boolean;
  notifiedAt: string;
}

const POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly baseUrl = `${environment.baseApiUrl}/notification`;

  private readonly notificationsSubject =
    new BehaviorSubject<AppNotification[]>([]);

  readonly notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authDetails: Authentication,
  ) {

    // Poll while the app is open so a sale completed by a colleague
    // shows up without needing a manual refresh. The first tick fires
    // immediately (startWith(0)).
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchFromServer()),
      )
      .subscribe();
  }

  get notifications(): AppNotification[] {
    return this.notificationsSubject.value;
  }

  get unreadCount(): number {
    return this.notificationsSubject.value.filter(n => !n.read).length;
  }

  refresh(): void {
    this.fetchFromServer().subscribe();
  }

  markAsRead(uid: string): void {

    const updated = this.notificationsSubject.value.map(n =>
      n.uid === uid ? { ...n, read: true } : n
    );

    this.notificationsSubject.next(updated);

    if (!this.authDetails.getToken()) {
      return;
    }

    this.http.post<Response<boolean>>(`${this.baseUrl}/markAsRead/${uid}`, null).subscribe({
      error: (error) => console.error('Error marking notification as read:', error),
    });
  }

  markAllAsRead(): void {

    const updated = this.notificationsSubject.value.map(n => ({ ...n, read: true }));

    this.notificationsSubject.next(updated);

    if (!this.authDetails.getToken()) {
      return;
    }

    this.http.post<Response<boolean>>(`${this.baseUrl}/markAllAsRead`, null).subscribe({
      error: (error) => console.error('Error marking all notifications as read:', error),
    });
  }

  private fetchFromServer() {

    if (!this.authDetails.getToken()) {
      return of(null);
    }

    return this.http.get<Response<BackendNotification[]>>(`${this.baseUrl}/findMyNotifications`).pipe(
      switchMap((res) => {

        const mapped: AppNotification[] = (res.data || []).map((n) => ({
          uid: n.uid,
          titleKey: n.titleKey,
          messageKey: n.messageKey,
          messageParams: n.paramsJson ? this.safeParse(n.paramsJson) : undefined,
          icon: n.icon || 'notifications',
          route: n.route || undefined,
          createdAt: new Date(n.notifiedAt),
          read: n.isRead,
        }));

        this.notificationsSubject.next(mapped);

        return of(mapped);
      }),
      catchError((error) => {
        console.error('Error loading notifications:', error);
        return of(null);
      }),
    );
  }

  private safeParse(json: string): Record<string, any> | undefined {
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }
}
