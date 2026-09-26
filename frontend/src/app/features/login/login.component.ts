import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur relative overflow-hidden">
        
        <!-- Subtle Glow Effect -->
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header -->
        <div class="text-center space-y-3 relative z-10">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white font-black text-2xl tracking-tighter">
            PF
          </div>
          <h2 class="text-2xl font-extrabold text-white tracking-tight">
            Personal Finance & AI Advisory
          </h2>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium">
            <span>🔒 Zero-Trust Perimeter • Keycloak OIDC</span>
          </div>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">
            Autenticação corporativa segura via OAuth 2.0 & OpenID Connect com PKCE.
          </p>
        </div>

        <!-- Main Action: PKCE Keycloak Login -->
        <div class="space-y-4 relative z-10 pt-2">
          <button (click)="loginWithKeycloak()"
                  [disabled]="loading"
                  class="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:via-purple-500 hover:to-emerald-500 shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50">
            <span class="text-lg">🔑</span>
            <span>Entrar com Keycloak (OIDC PKCE)</span>
          </button>
        </div>

        <!-- Security Features Info -->
        <div class="border-t border-slate-800/80 pt-4 text-left space-y-2 text-[11px] text-slate-400 font-mono relative z-10">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400">✔</span>
            <span>PKCE Authorization Code Flow (RFC 7636)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-400">✔</span>
            <span>Stateless JWKS Cryptographic Signature Check</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-400">✔</span>
            <span>Strict Role-Based Access Control (RBAC)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-400">✔</span>
            <span>Nenhuma senha trafega ou é armazenada no Frontend</span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  loading = false;
  private returnUrl = '/spreadsheet';

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/spreadsheet';

    // If already authenticated, navigate to returnUrl
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  loginWithKeycloak() {
    this.loading = true;
    this.auth.login();
  }
}
