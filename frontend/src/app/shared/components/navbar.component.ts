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
    <header class="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-2xl transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <!-- Left: Apple-Style Minimal Brand Identity -->
        <div class="flex items-center space-x-6">
          <a routerLink="/" class="flex items-center space-x-2.5 group cursor-pointer">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/15 group-hover:scale-105 transition">
              PF
            </div>
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-slate-100 text-sm tracking-tight group-hover:text-emerald-400 transition">Personal Finance</span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
          </a>

          <!-- Middle: Segmented Pill Navigation (Apple Segmented Bar) -->
          @if (auth.isAuthenticated()) {
            <nav class="hidden md:flex items-center p-1 bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-inner text-xs font-medium space-x-0.5">
              <a routerLink="/spreadsheet" 
                 routerLinkActive="bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60" 
                 [routerLinkActiveOptions]="{exact: false}"
                 class="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <span>📊</span>
                <span>Planilha</span>
              </a>

              <a routerLink="/analytics" 
                 routerLinkActive="bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60" 
                 class="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <span>📈</span>
                <span>Gráficos</span>
              </a>

              <a routerLink="/advisor" 
                 routerLinkActive="bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60" 
                 class="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <span>✨</span>
                <span>AI Advisor</span>
              </a>

              <a routerLink="/audit" 
                 routerLinkActive="bg-slate-800 text-white font-semibold shadow-sm border border-slate-700/60" 
                 class="px-3.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
                <span>📜</span>
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
                    class="p-2 text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl transition cursor-pointer disabled:opacity-50">
              <svg class="w-3.5 h-3.5" [class.animate-spin]="state.loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Apple-Style User Avatar & Popover Menu -->
            <div class="relative">
              <button (click)="toggleUserMenu($event)"
                      class="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 rounded-full transition cursor-pointer group">
                <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
                  {{ auth.currentUser()?.username?.[0]?.toUpperCase() || 'U' }}
                </div>
                <span class="hidden sm:inline text-xs font-medium text-slate-300 group-hover:text-white transition">
                  {{ auth.currentUser()?.name || auth.currentUser()?.username }}
                </span>
                <svg class="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Popover Menu -->
              @if (isUserMenuOpen()) {
                <div class="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  
                  <!-- Profile Header -->
                  <div class="border-b border-slate-800 pb-2.5">
                    <div class="font-semibold text-slate-100 text-xs">{{ auth.currentUser()?.name }}</div>
                    <div class="text-[11px] text-slate-400 truncate">{{ auth.currentUser()?.email || 'Autenticado via Keycloak' }}</div>
                    <div class="mt-1.5 flex items-center gap-1.5">
                      <span class="px-2 py-0.5 text-[10px] font-mono rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {{ auth.currentUser()?.roles?.[0] || 'user' }}
                      </span>
                      <span class="text-[10px] text-slate-500 font-mono">OIDC PKCE</span>
                    </div>
                  </div>

                  <!-- Tenant Switcher inside Menu -->
                  <div class="space-y-1">
                    <label class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tenant Ativo</label>
                    <select [ngModel]="state.tenantId()" (ngModelChange)="state.setTenantId($event)"
                            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                      <option value="default-user">default-user</option>
                      <option value="tenant-alice">tenant-alice</option>
                      <option value="tenant-bob">tenant-bob</option>
                      <option value="tenant-enterprise">tenant-enterprise</option>
                    </select>
                  </div>

                  <!-- Logout Button -->
                  <div class="border-t border-slate-800 pt-2">
                    <button (click)="auth.logout()" 
                            class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/25 rounded-xl transition text-xs font-semibold cursor-pointer">
                      <span>🚪</span>
                      <span>Encerrar Sessão (Sair)</span>
                    </button>
                  </div>

                </div>
              }
            </div>

          } @else {
            <!-- Login Button for Unauthenticated State -->
            <button (click)="auth.login()"
                    class="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs rounded-full transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer">
              <span>Entrar</span>
            </button>
          }
        </div>

      </div>
    </header>
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
