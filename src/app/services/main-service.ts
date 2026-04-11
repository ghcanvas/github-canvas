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

export interface UserPlan {
  githubUserId: string;
  year: number;
  activeIsos: string[] | string;
  text?: string | null;
  updatedAt?: string;
}

export interface SaveUserPlanRequest {
  activeIsos: string[];
  text: string;
}

export interface SaveUserPlanResponse extends UserPlan {
  ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class MainService {
  private readonly apiBase = 'https://api.githubcanvas.com';

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

  loadPlan(year: number): Observable<UserPlan | null> {
    return this.http
      .get<UserPlan>(`${this.apiBase}/plan/${year}`, { withCredentials: true })
      .pipe(catchError(() => of(null)));
  }

  savePlan(year: number, plan: SaveUserPlanRequest): Observable<SaveUserPlanResponse | null> {
    return this.http
      .put<SaveUserPlanResponse>(`${this.apiBase}/plan/${year}`, plan, { withCredentials: true })
      .pipe(catchError(() => of(null)));
  }

  logOut(): void {
    this.currentUserSubject.next(null);
    window.location.href = `${this.apiBase}/auth/logout`;
  }
}
