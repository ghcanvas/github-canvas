import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, NgFor } from '@angular/common';
import { MainService } from './services/main-service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, AsyncPipe, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private main = inject(MainService);

  protected readonly title = signal('github-canvas');

  users$ = this.main.users$;

  ngOnInit() {
    // triggers the HTTP request
    this.main.loadUsers().subscribe();
  }
}
