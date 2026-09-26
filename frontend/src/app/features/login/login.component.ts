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
      <div class="max-w-md w-full space-y-7 bg-[#0c1322] border border-slate-800 p-8 rounded-xl relative shadow-none">
        
        <!-- Header -->
        <div class="text-center space-y-3 relative z-10">
          <div class="mx-auto w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-bold text-lg">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-100 tracking-tight">
            Personal Finance Platform
          </h2>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono font-medium">
            <span>Zero-Trust Perimeter &bull; Keycloak OIDC</span>
          </div>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">
            Acesso corporativo seguro via OAuth 2.0 &amp; OpenID Connect com PKCE.
          </p>
        </div>

        <!-- Main Action: PKCE Keycloak Login -->
        <div class="space-y-4 relative z-10 pt-1">
          <button (click)="loginWithKeycloak()"
                  [disabled]="loading"
                  class="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-white font-medium text-xs bg-emerald-700 hover:bg-emerald-600 border border-emerald-600/40 transition cursor-pointer disabled:opacity-50">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>Entrar com Keycloak (OIDC PKCE)</span>
          </button>
        </div>

        <!-- Security Features Info -->
        <div class="border-t border-slate-800/80 pt-4 text-left space-y-2 text-[11px] text-slate-400 font-mono relative z-10">
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>PKCE Authorization Code Flow (RFC 7636)</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Stateless JWKS Cryptographic Signature Check</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Strict Role-Based Access Control (RBAC)</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Credenciais e tokens protegidos e isolados</span>
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
