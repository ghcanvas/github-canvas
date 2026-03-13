import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';

export interface AuthUser {
  login: string;
  id: string;
  avatarUrl: string;
  sessionId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MainService {
  private readonly apiBase = 'https://ue0ytmluui.execute-api.us-east-2.amazonaws.com';

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  loginWithGitHub(): void {
    window.location.href = `${this.apiBase}/auth/github/login`;
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${this.apiBase}/auth/me`, { withCredentials: true }).pipe(
      tap((user) => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      }),
    );
  }

  getCurrentUserSnapshot(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  logOut(): void {
    this.currentUserSubject.next(null);
    window.location.href = `${this.apiBase}/auth/logout`;
  }
}
