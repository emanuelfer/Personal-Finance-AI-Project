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
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <app-navbar></app-navbar>
      
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-outlet></router-outlet>
      </main>

      <footer class="border-t border-slate-900 py-4 text-center text-xs text-slate-600 font-mono">
        Personal Finance & AI Advisory Platform • CQRS & Event Sourcing • Virtual Threads • Redpanda • pgvector • LangChain4j Gemini • OpenTelemetry • Keycloak OIDC PKCE
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
