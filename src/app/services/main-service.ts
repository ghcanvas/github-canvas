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

export interface PublishedRepo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  private: boolean;
}

export interface PublishPlanResponse {
  ok: boolean;
  status: string;
  message: string;
  plan?: UserPlan;
  repo?: PublishedRepo;
}

export type PublishButtonAction = 'save_first' | 'publish' | 'republish';

export interface PublishButtonState {
  label: string;
  enabled: boolean;
  action: PublishButtonAction;
  helperText?: string | null;
}

export interface PublishStatusResponse {
  ok: boolean;
  year: number;
  saved: boolean;
  published: boolean;
  repoName: string;
  repoUrl?: string | null;
  repo?: PublishedRepo | null;
  planSummary?: unknown;
  buttonState: PublishButtonState;
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

  publishPlan(year: number): Observable<PublishPlanResponse | null> {
    return this.http
      .post<PublishPlanResponse>(`${this.apiBase}/plans/${year}/publish`, null, {
        withCredentials: true,
      })
      .pipe(catchError(() => of(null)));
  }

  republishPlan(year: number): Observable<PublishPlanResponse | null> {
    return this.http
      .post<PublishPlanResponse>(`${this.apiBase}/plans/${year}/republish`, null, {
        withCredentials: true,
      })
      .pipe(catchError(() => of(null)));
  }

  loadPublishStatus(year: number): Observable<PublishStatusResponse | null> {
    return this.http
      .get<PublishStatusResponse>(`${this.apiBase}/plans/${year}/publish-status`, {
        withCredentials: true,
      })
      .pipe(catchError(() => of(null)));
  }

  logOut(): void {
    this.currentUserSubject.next(null);
    window.location.href = `${this.apiBase}/auth/logout`;
  }
}
