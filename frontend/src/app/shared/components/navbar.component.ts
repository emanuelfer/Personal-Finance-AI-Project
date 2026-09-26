import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { StateService } from '../../core/services/state.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090e1a]/90 backdrop-blur-md transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <!-- Left: Minimalist Institutional Brand Identity -->
        <div class="flex items-center space-x-6">
          <a routerLink="/" class="flex items-center space-x-2.5 group cursor-pointer">
            <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-semibold text-xs tracking-wider shadow-none group-hover:border-emerald-500/50 group-hover:text-emerald-300 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20m9-9H3" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-100 text-sm tracking-tight group-hover:text-slate-200 transition">Personal Finance</span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
          </a>

          <!-- Middle: Segmented Pill Navigation for Desktop -->
          @if (auth.isAuthenticated()) {
            <nav class="hidden md:flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium space-x-1">
              <a routerLink="/spreadsheet" 
                 routerLinkActive="bg-slate-800 text-white font-medium shadow-none border border-slate-700/80" 
                 [routerLinkActiveOptions]="{exact: false}"
                 class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18" />
                </svg>
                <span>Planilha</span>
              </a>

              <a routerLink="/analytics" 
                 routerLinkActive="bg-slate-800 text-white font-medium shadow-none border border-slate-700/80" 
                 class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M18 9l-5 5-4-4-3 3" />
                </svg>
                <span>Gráficos</span>
              </a>

              <a routerLink="/advisor" 
                 routerLinkActive="bg-slate-800 text-white font-medium shadow-none border border-slate-700/80" 
                 class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Consultor</span>
              </a>

              <a routerLink="/audit" 
                 routerLinkActive="bg-slate-800 text-white font-medium shadow-none border border-slate-700/80" 
                 class="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Auditoria</span>
              </a>
            </nav>
          }
        </div>

        <!-- Right: Actions & Clean User Profile Menu -->
        <div class="flex items-center space-x-2">
          @if (auth.isAuthenticated()) {
            
            <!-- Compact Refresh Status Button -->
            <button (click)="state.refreshAll()" 
                    [disabled]="state.loading()"
                    title="Atualizar dados"
                    class="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition cursor-pointer disabled:opacity-50">
              <svg class="w-3.5 h-3.5" [class.animate-spin]="state.loading()" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Minimalist User Avatar & Popover Menu -->
            <div class="relative">
              <button (click)="toggleUserMenu($event)"
                      class="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition cursor-pointer group">
                <div class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-medium text-slate-300 text-[11px]">
                  {{ auth.currentUser()?.username?.[0]?.toUpperCase() || 'U' }}
                </div>
                <span class="hidden sm:inline text-xs font-medium text-slate-300 group-hover:text-white transition">
                  {{ auth.currentUser()?.name || auth.currentUser()?.username }}
                </span>
                <svg class="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Popover Menu -->
              @if (isUserMenuOpen()) {
                <div class="absolute right-0 mt-2 w-64 bg-[#0c1322] border border-slate-800 rounded-xl shadow-xl p-3 space-y-3 z-50">
                  
                  <!-- Profile Header -->
                  <div class="border-b border-slate-800 pb-2.5">
                    <div class="font-medium text-slate-100 text-xs">{{ auth.currentUser()?.name }}</div>
                    <div class="text-[11px] text-slate-400 truncate">{{ auth.currentUser()?.email || 'Autenticado via Keycloak' }}</div>
                    <div class="mt-1.5 flex items-center gap-1.5">
                      <span class="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-emerald-400 border border-emerald-500/20 font-medium">
                        {{ auth.currentUser()?.roles?.[0] || 'user' }}
                      </span>
                      <span class="text-[10px] text-slate-500 font-mono">OIDC PKCE</span>
                    </div>
                  </div>

                  <!-- Tenant Switcher inside Menu -->
                  <div class="space-y-1">
                    <label class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tenant Ativo</label>
                    <select [ngModel]="state.tenantId()" (ngModelChange)="state.setTenantId($event)"
                            class="w-full bg-[#060913] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-600 cursor-pointer">
                      <option value="default-user">default-user</option>
                      <option value="tenant-alice">tenant-alice</option>
                      <option value="tenant-bob">tenant-bob</option>
                      <option value="tenant-enterprise">tenant-enterprise</option>
                    </select>
                  </div>

                  <!-- Logout Button -->
                  <div class="border-t border-slate-800 pt-2">
                    <button (click)="auth.logout()" 
                            class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-rose-950/30 text-rose-300 hover:text-rose-200 border border-slate-800 hover:border-rose-900/50 rounded-lg transition text-xs font-medium cursor-pointer">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>

                </div>
              }
            </div>

          } @else {
            <!-- Login Button for Unauthenticated State -->
            <button (click)="auth.login()"
                    class="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs rounded-lg transition flex items-center gap-1.5 border border-emerald-600/30 cursor-pointer">
              <span>Entrar</span>
            </button>
          }
        </div>

      </div>
    </header>

    <!-- Mobile-First Bottom Navigation Bar (< md) -->
    @if (auth.isAuthenticated()) {
      <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#090e1a]/95 border-t border-slate-800/90 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <a routerLink="/spreadsheet" 
           routerLinkActive="text-emerald-400 font-semibold" 
           [routerLinkActiveOptions]="{exact: false}"
           class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition">
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18" />
          </svg>
          <span class="text-[10px]">Planilha</span>
        </a>

        <a routerLink="/analytics" 
           routerLinkActive="text-emerald-400 font-semibold" 
           class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition">
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M18 9l-5 5-4-4-3 3" />
          </svg>
          <span class="text-[10px]">Gráficos</span>
        </a>

        <a routerLink="/advisor" 
           routerLinkActive="text-emerald-400 font-semibold" 
           class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition">
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span class="text-[10px]">Consultor</span>
        </a>

        <a routerLink="/audit" 
           routerLinkActive="text-emerald-400 font-semibold" 
           class="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-200 transition">
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[10px]">Auditoria</span>
        </a>
      </nav>
    }
  `
})
export class NavbarComponent {
  state = inject(StateService);
  auth = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isUserMenuOpen = signal<boolean>(false);

  constructor() {
    // Auto close menus on route navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeMenus();
    });
  }

  toggleUserMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isUserMenuOpen.update(v => !v);
  }

  closeMenus() {
    this.isUserMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenus();
    }
  }
}
