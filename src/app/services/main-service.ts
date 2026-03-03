import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  address?: { city?: string };
}

@Injectable({ providedIn: 'root' })
export class MainService {
  private readonly usersUrl = 'https://jsonplaceholder.typicode.com/users';

  //test4

  // state holder
  private readonly usersSubject = new BehaviorSubject<User[]>([]);

  // public stream
  readonly users$: Observable<User[]> = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {}

  // fetch + push into subject
  loadUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl).pipe(tap((users) => this.usersSubject.next(users)));
  }
}
