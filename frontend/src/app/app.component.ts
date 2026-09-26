import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-900 selection:text-emerald-100">
      <app-navbar></app-navbar>
      
      <main class="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8">
        <router-outlet></router-outlet>
      </main>

      <footer class="hidden md:block border-t border-slate-900/80 py-4 text-center text-[11px] text-slate-500 font-mono tracking-tight">
        Personal Finance Platform &bull; CQRS &amp; Event Sourcing &bull; PostgreSQL &bull; Keycloak OIDC PKCE
      </footer>
    </div>
  `
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);

  ngOnInit() {
    this.auth.handleAuthCallback().subscribe();
  }
}
