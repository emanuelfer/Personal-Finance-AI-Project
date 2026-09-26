import { Component, OnInit, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { FinanceApiService } from '../../core/services/finance-api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  MonthSpreadsheetData,
  SpreadsheetExpenseItem,
  ExpenseOwner,
  ProfileView,
  TimeHorizon,
  ChatMessage,
  CatalogExpense,
  HouseholdMember
} from '../../core/models/finance.models';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

@Component({
  selector: 'app-spreadsheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Apple-Inspired Minimalist Top Header & Action Bar -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-800/80 pb-3.5">
        
        <!-- Left: Crisp Title & Minimalist Year Capsule -->
        <div class="flex items-center space-x-3">
          <h1 class="text-xl font-bold text-white tracking-tight">Planilha Financeira</h1>
          
          <!-- Year Selector Capsule (Apple Style) -->
          <div class="inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 font-mono text-xs shadow-inner">
            <button (click)="changeYear(selectedYear - 1)" title="Ano Anterior" class="px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer">
              ◀
            </button>
            <span class="px-2.5 py-1 font-bold text-emerald-400 text-xs">
              {{ selectedYear }}
            </span>
            <button (click)="changeYear(selectedYear + 1)" title="Próximo Ano" class="px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer">
              ▶
            </button>
          </div>
        </div>

        <!-- Center / Right: Apple Segmented Profile Switcher + Action Controls -->
        <div class="flex items-center gap-2 flex-wrap">
          
          <!-- Apple-Style Segmented Profile Control (Dynamic Members) -->
          <div class="inline-flex p-1 bg-slate-900/90 border border-slate-800/90 rounded-xl shadow-inner text-xs font-medium space-x-0.5 items-center">
            @for (mem of members; track mem.id) {
              <button (click)="setProfile(mem.id)"
                      class="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      [ngClass]="activeProfile === mem.id ? getProfileButtonActiveClass(mem) : 'text-slate-400 hover:text-slate-200'">
                <span>{{ mem.icon }}</span>
                <span>{{ mem.name }}</span>
              </button>
            }

            <button (click)="setProfile('CONSOLIDADO')"
                    class="px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    [ngClass]="activeProfile === 'CONSOLIDADO' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'">
              <span>👥</span>
              <span>Consolidado</span>
            </button>

            <!-- Quick Add Member button directly on profile tabs -->
            <button (click)="openMemberManagerModal()"
                    title="Adicionar ou Gerenciar Membros da Família"
                    class="px-2.5 py-1.5 rounded-lg text-indigo-400 hover:text-indigo-200 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 font-bold">
              <span>+</span>
              <span class="text-xs font-medium">Membro</span>
            </button>
          </div>

          <!-- Base Capital de Giro Popover Trigger (Apple Pill) -->
          <div class="relative">
            <button (click)="toggleGiroPopover()"
                    title="Configurar Capital de Giro Base Inicial"
                    class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-slate-700 rounded-xl text-xs font-medium text-amber-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm">
              <span>🏦</span>
              <span>Giro: <strong>R$ {{ getActiveBaseGiroTotal() | number:'1.0-0' }}</strong></span>
              <svg class="w-3 h-3 text-slate-500 transition-transform" [class.rotate-180]="showGiroPopover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Floating Popover for Giro Values -->
            @if (showGiroPopover) {
              <div class="absolute right-0 mt-2 w-72 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 space-y-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>🏦</span>
                    <span>Capital de Giro Inicial Base</span>
                  </div>
                  <button (click)="showGiroPopover = false" class="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
                </div>

                <div class="space-y-2 text-xs">
                  @for (mem of members; track mem.id) {
                    <div class="flex items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                      <span class="font-medium" [ngClass]="getMemberTextColor(mem)">{{ mem.icon }} {{ mem.name }}:</span>
                      <div class="flex items-center gap-1">
                        <span class="text-slate-500 font-mono text-[10px]">R$</span>
                        <input type="number" step="0.01" [(ngModel)]="mem.baseInitialCapitalGiro" (ngModelChange)="onMemberGiroChange(mem, $event)"
                               class="w-24 bg-transparent text-amber-300 font-mono font-bold text-right focus:outline-none" />
                      </div>
                    </div>
                  }
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  <span>Total Base:</span>
                  <span class="text-amber-300 font-bold">R$ {{ getTotalBaseCapitalGiro() | number:'1.2-2' }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Manage Members Button -->
          <button (click)="openMemberManagerModal()"
                  title="Gerenciar Membros da Família (Adicionar/Editar/Remover)"
                  class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm">
            <span>⚙️</span>
            <span>Membros</span>
            <span class="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-[10px] font-mono">{{ members.length }}</span>
          </button>

          <!-- Expense Catalog Pill Button -->
          <button (click)="toggleCatalogDrawer()"
                  title="Abrir Catálogo de Despesas Recorrentes"
                  class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-purple-500/40 text-purple-300 hover:text-purple-200 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm">
            <span>📑</span>
            <span>Catálogo</span>
            <span class="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[10px] font-mono">{{ catalogExpenses.length }}</span>
          </button>

          <!-- Reload / Sync from DB Button -->
          <button (click)="forceReloadFromDatabase()" [disabled]="saveStatus === 'saving'"
                  title="Recarregar dados mais recentes do Banco de Dados"
                  class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 text-cyan-300 hover:text-cyan-200 border border-slate-800/90 hover:border-cyan-500/40 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50">
            <span>🔄</span>
            <span>Sincronizar</span>
          </button>

          <!-- Save Button -->
          <button (click)="manualSave()" [disabled]="saveStatus === 'saving'"
                  title="Salvar no PostgreSQL"
                  class="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800/90 hover:border-slate-700 text-xs font-medium rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50">
            @if (saveStatus === 'saving') {
              <span class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            } @else {
              <span>💾</span>
            }
            <span>Salvar</span>
          </button>

          <!-- AI Assistant Trigger Button -->
          <button (click)="toggleAiDrawer()"
                  title="Abrir Assistente Financeiro IA"
                  class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer">
            <span>🤖</span>
            <span>Assistente IA</span>
          </button>

        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- HOUSEHOLD MEMBERS MANAGER MODAL (GERENCIAR MEMBROS DA FAMÍLIA) -->
      <!-- ========================================================================= -->
      @if (showMemberModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
             (click)="closeMemberManagerModal()">
          <div class="glass-panel w-full max-w-2xl rounded-2xl p-5 border-2 border-indigo-500/40 space-y-5 bg-slate-900/95 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto"
               (click)="$event.stopPropagation()">
          
            <!-- Modal Header -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Gerenciar Membros da Família</span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                      {{ members.length }} {{ members.length === 1 ? 'membro' : 'membros' }}
                    </span>
                  </h3>
                  <p class="text-xs text-slate-400">
                    Adicione, edite ou remova membros da família. Cada membro possui seu próprio fluxo de rendimentos, capital de giro e reserva de emergência!
                  </p>
                </div>
              </div>

              <button (click)="closeMemberManagerModal()" class="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 cursor-pointer">
                ✕ Fechar
              </button>
            </div>

            <!-- Toast / Feedback Message -->
            @if (memberFeedbackMessage) {
              <div class="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <span>✓</span>
                <span>{{ memberFeedbackMessage }}</span>
              </div>
            }

            <!-- Members Grid (Cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (mem of members; track mem.id) {
                <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">{{ mem.icon }}</span>
                      <div>
                        <h4 class="text-sm font-bold text-white">{{ mem.name }}</h4>
                        <span class="text-[10px] px-2 py-0.5 rounded font-mono uppercase" [ngClass]="getMemberBadgeClass(mem)">
                          {{ mem.color }}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <button (click)="startEditMember(mem)" title="Editar Membro" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-300 text-xs cursor-pointer">
                        ✏️
                      </button>
                      <button (click)="removeMember(mem)" [disabled]="members.length <= 1" title="Remover Membro" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-20 text-xs cursor-pointer">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <div>
                      <span class="text-slate-500 block text-[10px]">Reserva Base:</span>
                      <span class="text-emerald-400 font-bold">R$ {{ mem.baseInitialReserve | number:'1.2-2' }}</span>
                    </div>
                    <div>
                      <span class="text-slate-500 block text-[10px]">Giro Base:</span>
                      <span class="text-amber-400 font-bold">R$ {{ mem.baseInitialCapitalGiro | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Add / Edit Member Form -->
            <div class="bg-slate-900/95 p-4 rounded-xl border border-slate-800 space-y-3">
              <div class="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <span class="text-indigo-400 font-mono text-sm">{{ editingMemberId ? '✏️' : '+' }}</span>
                  <span>{{ editingMemberId ? 'Editar Membro: ' + editMemberName : 'Adicionar Novo Membro da Família' }}</span>
                </span>
                @if (editingMemberId) {
                  <button (click)="cancelEditMember()" class="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer">
                    Cancelar Edição
                  </button>
                }
              </div>

              @if (editingMemberId) {
                <!-- Edit Form -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div class="md:col-span-2">
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Nome do Membro</label>
                    <input type="text" [(ngModel)]="editMemberName" placeholder="Ex: Carlos, Sofia, Filho..."
                           class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Ícone</label>
                    <select [(ngModel)]="editMemberIcon" class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none">
                      <option value="👨">👨 Homem</option>
                      <option value="👩">👩 Mulher</option>
                      <option value="🧒">🧒 Filho(a)</option>
                      <option value="👶">👶 Bebê</option>
                      <option value="👵">👵 Avó</option>
                      <option value="🧓">🧓 Avô</option>
                      <option value="👤">👤 Outro</option>
                      <option value="💼">💼 Trabalho</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Cor</label>
                    <select [(ngModel)]="editMemberColor" class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none">
                      <option value="indigo">Indigo (Azul)</option>
                      <option value="purple">Purple (Roxo)</option>
                      <option value="emerald">Emerald (Verde)</option>
                      <option value="amber">Amber (Amarelo)</option>
                      <option value="rose">Rose (Rosa)</option>
                      <option value="sky">Sky (Ciano)</option>
                      <option value="cyan">Cyan</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Reserva Base (R$)</label>
                    <input type="number" step="0.01" [(ngModel)]="editMemberBaseReserve" placeholder="0.00"
                           class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs px-3 py-2 rounded-lg focus:outline-none text-right" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Giro Base (R$)</label>
                    <input type="number" step="0.01" [(ngModel)]="editMemberBaseGiro" placeholder="0.00"
                           class="w-full bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-xs px-3 py-2 rounded-lg focus:outline-none text-right" />
                  </div>
                  <div class="md:col-span-5 flex justify-end gap-2 pt-1">
                    <button (click)="saveEditMember()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer">
                      ✓ Salvar Alterações
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Add Form -->
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div class="md:col-span-2">
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Nome do Membro *</label>
                    <input type="text" [(ngModel)]="newMemberName" (keyup.enter)="addMember()" placeholder="Ex: Carlos, Sofia, Filho..."
                           class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Ícone</label>
                    <select [(ngModel)]="newMemberIcon" class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none">
                      <option value="👨">👨 Homem</option>
                      <option value="👩">👩 Mulher</option>
                      <option value="🧒">🧒 Filho(a)</option>
                      <option value="👶">👶 Bebê</option>
                      <option value="👵">👵 Avó</option>
                      <option value="🧓">🧓 Avô</option>
                      <option value="👤">👤 Outro</option>
                      <option value="💼">💼 Trabalho</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Cor</label>
                    <select [(ngModel)]="newMemberColor" class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none">
                      <option value="indigo">Indigo (Azul)</option>
                      <option value="purple">Purple (Roxo)</option>
                      <option value="emerald">Emerald (Verde)</option>
                      <option value="amber">Amber (Amarelo)</option>
                      <option value="rose">Rose (Rosa)</option>
                      <option value="sky">Sky (Ciano)</option>
                      <option value="cyan">Cyan</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Reserva Base (R$)</label>
                    <input type="number" step="0.01" [(ngModel)]="newMemberBaseReserve" (keyup.enter)="addMember()" placeholder="0.00"
                           class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs px-3 py-2 rounded-lg focus:outline-none text-right" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Giro Base (R$)</label>
                    <input type="number" step="0.01" [(ngModel)]="newMemberBaseGiro" (keyup.enter)="addMember()" placeholder="0.00"
                           class="w-full bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-xs px-3 py-2 rounded-lg focus:outline-none text-right" />
                  </div>
                  <div class="md:col-span-5 flex justify-end gap-2 pt-1">
                    <button (click)="addMember()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer">
                      <span>+</span>
                      <span>Adicionar Membro à Família</span>
                    </button>
                  </div>
                </div>
              }
            </div>

          </div>
        </div>
      }

      <!-- ========================================================================= -->
      <!-- EXPENSE CATALOG DRAWER / MODAL (CATÁLOGO DE DESPESAS POR USUÁRIO) -->
      <!-- ========================================================================= -->
      @if (showCatalogDrawer) {
        <div class="glass-panel rounded-2xl p-5 border-2 border-purple-500/40 space-y-4 animate-in fade-in duration-200 bg-slate-950/90 shadow-2xl">
          
          <!-- Catalog Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/20">
                📑
              </div>
              <div>
                <h3 class="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Catálogo de Despesas & Valores Padrão</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                    {{ catalogExpenses.length }} cadastradas
                  </span>
                </h3>
                <p class="text-xs text-slate-400">
                  Crie e personalize despesas para qualquer membro da família ou 🏠 Compartilhadas com valores padrão. Edite a qualquer momento!
                </p>
              </div>
            </div>

            <button (click)="toggleCatalogDrawer()" class="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 cursor-pointer">
              ✕ Fechar Catálogo
            </button>
          </div>

          <!-- Catalog Filter Tabs by Owner -->
          <div class="flex items-center gap-2 flex-wrap border-b border-slate-800/80 pb-3">
            <span class="text-slate-400 text-xs font-mono">Filtrar por Usuário:</span>
            
            <button (click)="catalogFilterOwner = 'ALL'"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    [ngClass]="catalogFilterOwner === 'ALL' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
              <span>👥 Todas ({{ catalogExpenses.length }})</span>
            </button>

            @for (mem of members; track mem.id) {
              <button (click)="catalogFilterOwner = mem.name"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      [ngClass]="catalogFilterOwner === mem.name ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>{{ mem.icon }} {{ mem.name }} ({{ getCatalogCountByOwner(mem.name) }})</span>
              </button>
            }

            <button (click)="catalogFilterOwner = 'Compartilhado'"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    [ngClass]="catalogFilterOwner === 'Compartilhado' ? 'bg-teal-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
              <span>🏠 Compartilhadas ({{ getCatalogCountByOwner('Compartilhado') }})</span>
            </button>
          </div>

          <!-- Form to Create New Catalog Item -->
          <div class="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div class="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span class="text-emerald-400 font-mono">+</span>
              <span>Cadastrar Nova Despesa no Catálogo</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              
              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Descrição da Despesa</label>
                <input type="text" [(ngModel)]="newCatalogDesc" (keyup.enter)="createCatalogItem()"
                       placeholder="Ex: Financiamento, Seguro, Academia..."
                       class="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-purple-400 font-sans" />
              </div>

              <!-- Default Amount -->
              <div>
                <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Valor Padrão (R$)</label>
                <input type="number" step="0.01" [(ngModel)]="newCatalogAmount" (keyup.enter)="createCatalogItem()"
                       placeholder="0.00"
                       class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-purple-400 text-right" />
              </div>

              <!-- Owner -->
              <div>
                <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Responsável</label>
                <select [(ngModel)]="newCatalogOwner" class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none">
                  @for (mem of members; track mem.id) {
                    <option [value]="mem.name">{{ mem.icon }} {{ mem.name }}</option>
                  }
                  <option value="Compartilhado">🏠 Compartilhado</option>
                </select>
              </div>

              <!-- Category & Submit Button -->
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <label class="block text-[10px] text-slate-400 uppercase font-mono mb-1">Categoria</label>
                  <select [(ngModel)]="newCatalogCategory" class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg focus:outline-none">
                    <option value="CARTAO">💳 Cartão</option>
                    <option value="MORADIA">🏠 Moradia</option>
                    <option value="CONTAS">💡 Contas</option>
                    <option value="TAXAS">🏛️ Taxas/Impostos</option>
                    <option value="REFORMA">🔧 Reforma</option>
                    <option value="GERAL">📦 Geral</option>
                  </select>
                </div>
                <button (click)="createCatalogItem()" [disabled]="!newCatalogDesc.trim()"
                        class="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition shadow-md whitespace-nowrap">
                  + Salvar
                </button>
              </div>

            </div>
          </div>

          <!-- Catalog Items Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            @for (item of filteredCatalogExpenses; track item.id) {
              <div class="p-3 rounded-xl border bg-slate-900/70 transition flex flex-col justify-between gap-2.5 group"
                   [ngClass]="editingCatalogId === item.id ? 'border-purple-500 bg-slate-900 shadow-lg' : 'border-slate-800 hover:border-slate-700'">
                
                @if (editingCatalogId === item.id) {
                  <!-- Inline Edit Mode for Catalog Item -->
                  <div class="space-y-2">
                    <div class="text-[10px] font-mono text-purple-400 font-bold uppercase">Editando Despesa do Catálogo:</div>
                    
                    <div>
                      <label class="text-[9px] text-slate-400">Descrição:</label>
                      <input type="text" [(ngModel)]="editCatalogDesc"
                             class="w-full bg-slate-950 border border-slate-700 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-purple-400" />
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div>
                        <label class="text-[9px] text-slate-400">Valor Padrão (R$):</label>
                        <input type="number" step="0.01" [(ngModel)]="editCatalogAmount"
                               class="w-full bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold text-xs px-2 py-1 rounded focus:outline-none text-right" />
                      </div>

                      <div>
                        <label class="text-[9px] text-slate-400">Responsável:</label>
                        <select [(ngModel)]="editCatalogOwner" class="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs px-1.5 py-1 rounded focus:outline-none">
                          @for (mem of members; track mem.id) {
                            <option [value]="mem.name">{{ mem.icon }} {{ mem.name }}</option>
                          }
                          <option value="Compartilhado">🏠 Compartilhado</option>
                        </select>
                      </div>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                      <button (click)="cancelEditCatalogItem()" class="px-2.5 py-1 text-slate-400 hover:text-white text-xs rounded bg-slate-800">
                        Cancelar
                      </button>
                      <button (click)="saveEditCatalogItem(item)" [disabled]="!editCatalogDesc.trim()"
                              class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded shadow">
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- Standard Display Mode -->
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-base">{{ item.icon || '💳' }}</span>
                      <div>
                        <div class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{{ item.description }}</span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase inline-block mt-1"
                              [ngClass]="getOwnerBadgeClass(item.owner)">
                          {{ getOwnerLabel(item.owner) }}
                        </span>
                      </div>
                    </div>

                    <div class="text-right font-mono">
                      <div class="text-xs font-extrabold text-emerald-400">
                        R$ {{ item.defaultAmount | number:'1.2-2' }}
                      </div>
                      <div class="text-[9px] text-slate-500">Valor Padrão</div>
                    </div>
                  </div>

                  <!-- Action Buttons on Catalog Item -->
                  <div class="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                    <div class="flex items-center gap-1.5">
                      <button (click)="startEditCatalogItem(item)" 
                              title="Editar descrição ou valor padrão desta despesa"
                              class="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 text-[11px] font-semibold transition">
                        ✏️ Editar
                      </button>

                      <button (click)="deleteCatalogItem(item)"
                              title="Remover do catálogo"
                              class="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition">
                        🗑️
                      </button>
                    </div>

                    <div class="flex items-center gap-1">
                      <button (click)="insertCatalogItemIntoMonth(item, primaryDisplayedMonth)"
                              title="Inserir esta despesa apenas no mês de {{ primaryDisplayedMonth.monthName }}"
                              class="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-bold transition">
                        + {{ primaryDisplayedMonth.monthName }}
                      </button>

                      <button (click)="insertCatalogItemIntoForwardMonths(item, primaryDisplayedMonth)"
                              title="Replicar esta despesa a partir de {{ primaryDisplayedMonth.monthName }} para os próximos meses"
                              class="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600 hover:text-white text-purple-300 text-[10px] font-bold transition">
                        🔁 Próximos Meses
                      </button>

                      <button (click)="insertCatalogItemIntoAllMonths(item)"
                              title="Inserir como linha em todos os 12 meses do ano"
                              class="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white text-cyan-400 text-[10px] font-bold transition">
                        🗓️ Todos
                      </button>
                    </div>
                  </div>
                }

              </div>
            }
          </div>

        </div>
      }

      <!-- Time Horizon / Period Selector Ribbon (5 Temporal Modes) -->
      <div class="glass-panel p-2.5 sm:p-3 rounded-2xl space-y-2.5 border border-slate-800">
        
        <!-- Months Row (Always Showed) + Expand/Collapse Button -->
        <div class="flex items-center justify-between gap-2">
          
          <!-- Sub-Period Range Selector Tabs (Janeiro, Fevereiro, Março, ...) -->
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-0.5 flex-1 min-w-0">
            @if (timeHorizon === 'MENSAL') {
              @for (m of currentYearMonths; track m.id; let idx = $index) {
                <button (click)="activeMonthIndex = idx"
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap"
                        [ngClass]="activeMonthIndex === idx ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10' : 'bg-transparent text-slate-400 hover:text-white'">
                  {{ m.monthName }}
                </button>
              }
            }

            @if (timeHorizon === 'BIMESTRAL') {
              @for (b of bimesters; track b.id; let bIdx = $index) {
                <button (click)="activeBimesterIndex = bIdx"
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap"
                        [ngClass]="activeBimesterIndex === bIdx ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10' : 'bg-transparent text-slate-400 hover:text-white'">
                  {{ b.title }} ({{ b.subtitle }})
                </button>
              }
            }

            @if (timeHorizon === 'TRIMESTRAL') {
              @for (q of quarters; track q.id; let qIdx = $index) {
                <button (click)="activeQuarterIndex = qIdx"
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap"
                        [ngClass]="activeQuarterIndex === qIdx ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10' : 'bg-transparent text-slate-400 hover:text-white'">
                  {{ q.title }} ({{ q.subtitle }})
                </button>
              }
            }

            @if (timeHorizon === 'SEMESTRAL') {
              @for (s of semesters; track s.id; let sIdx = $index) {
                <button (click)="activeSemesterIndex = sIdx"
                        class="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap"
                        [ngClass]="activeSemesterIndex === sIdx ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10' : 'bg-transparent text-slate-400 hover:text-white'">
                  {{ s.title }} ({{ s.subtitle }})
                </button>
              }
            }

            @if (timeHorizon === 'ANUAL') {
              <span class="text-xs text-slate-400 font-mono px-2 py-1">
                Visualizando todos os 12 meses de {{ selectedYear }} lado a lado com rolagem contínua
              </span>
            }
          </div>

          <!-- Expand/Collapse Period Options Button -->
          <button (click)="showPeriodOptions = !showPeriodOptions"
                  title="Alterar modo de visualização (Mensal, Bimestral, Trimestral, Semestral, Anual)"
                  class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 shrink-0">
            <span class="text-slate-400 font-mono text-[11px] hidden sm:inline">Período:</span>
            <span class="text-emerald-400 font-bold font-mono text-[11px]">{{ getTimeHorizonLabel(timeHorizon) }}</span>
            <span class="text-[9px] text-slate-500">{{ showPeriodOptions ? '▲' : '▼' }}</span>
          </button>

        </div>

        <!-- Primary Horizon Buttons (Collapsed by default, expands on click) -->
        @if (showPeriodOptions) {
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-slate-400 font-mono text-xs px-1">Período de Visualização:</span>
              
              <button (click)="setTimeHorizon('MENSAL')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      [ngClass]="timeHorizon === 'MENSAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>📅 Mês (1 Mês)</span>
              </button>

              <button (click)="setTimeHorizon('BIMESTRAL')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      [ngClass]="timeHorizon === 'BIMESTRAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>🌓 Bimestral (2 Meses)</span>
              </button>

              <button (click)="setTimeHorizon('TRIMESTRAL')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      [ngClass]="timeHorizon === 'TRIMESTRAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>📊 Trimestral (3 Meses)</span>
              </button>

              <button (click)="setTimeHorizon('SEMESTRAL')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      [ngClass]="timeHorizon === 'SEMESTRAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>📈 Semestral (6 Meses)</span>
              </button>

              <button (click)="setTimeHorizon('ANUAL')"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      [ngClass]="timeHorizon === 'ANUAL' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'">
                <span>🗓️ Ano Completo (12 Meses)</span>
              </button>
            </div>

            <!-- Active Period Summary Tag -->
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Colunas Exibidas: <strong class="text-emerald-400">{{ displayedMonths.length }} meses individuais</strong>
              </span>
            </div>
          </div>
        }

      </div>

      <!-- Financial Metrics Ribbon (KPIs for the First Month in the Active Display Range) -->
      @if (displayedMonths.length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          <!-- Capital de Giro (Residual após Resultado do Mês) -->
          <div class="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-slate-800">
            <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Capital de Giro</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                {{ primaryDisplayedMonth.monthName }}
              </span>
            </div>
            <div class="text-2xl font-extrabold text-amber-300 mt-1.5 font-mono">
              R$ {{ getProfileFinalCapitalGiro(primaryDisplayedMonth) | number:'1.2-2' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Saldo residual disponível após o resultado do mês
            </div>
          </div>

          <!-- Rendimentos -->
          <div class="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-slate-800">
            <div class="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center justify-between">
              <span>Rendimentos</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300">Entradas</span>
            </div>
            <div class="text-2xl font-extrabold text-teal-400 mt-1.5 font-mono">
              R$ {{ getProfileIncome(primaryDisplayedMonth) | number:'1.2-2' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Receitas {{ activeProfile === 'CONSOLIDADO' ? 'Totais' : 'de ' + activeProfile }}
            </div>
          </div>

          <!-- Total de Gastos -->
          <div class="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-slate-800">
            <div class="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total de Gastos</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">
                {{ getFilteredExpenses(primaryDisplayedMonth).length }} despesas
              </span>
            </div>
            <div class="text-2xl font-extrabold text-rose-400 mt-1.5 font-mono">
              R$ {{ getProfileTotalExpenses(primaryDisplayedMonth) | number:'1.2-2' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Gastos {{ activeProfile === 'CONSOLIDADO' ? 'Consolidados' : 'de ' + activeProfile }}
            </div>
          </div>

          <!-- Resultado do Mês (Surplus / Deficit = Rendimentos - Gastos) -->
          <div class="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-slate-800">
            <div class="text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
                 [ngClass]="getProfileResultado(primaryDisplayedMonth) >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              <span>Resultado do Mês</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    [ngClass]="getProfileResultado(primaryDisplayedMonth) >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'">
                {{ getProfileResultado(primaryDisplayedMonth) >= 0 ? 'Superávit' : 'Déficit' }}
              </span>
            </div>
            <div class="text-2xl font-extrabold mt-1.5 font-mono"
                 [ngClass]="getProfileResultado(primaryDisplayedMonth) >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              {{ getProfileResultado(primaryDisplayedMonth) >= 0 ? '+' : '' }}R$ {{ getProfileResultado(primaryDisplayedMonth) | number:'1.2-2' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Rendimentos - Gastos exato
            </div>
          </div>

          <!-- Caixa Final (Reserva de Emergência Protegida) -->
          <div class="glass-panel p-4 rounded-2xl relative overflow-hidden group border border-slate-800 bg-emerald-950/20">
            <div class="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
              <span>Caixa Final (Reserva)</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                {{ activeProfile === 'CONSOLIDADO' ? 'Unificada' : activeProfile }}
              </span>
            </div>
            <div class="text-2xl font-black text-cyan-300 mt-1.5 font-mono">
              R$ {{ getProfileFinalCash(selectedYear, primaryDisplayedMonth.monthIndex) | number:'1.2-2' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Reserva acumulada no banco de dados
            </div>
          </div>

        </div>
      }

      <!-- Main Spreadsheet Matrix (Renders Each Individual Month Separately) -->
      <div class="glass-panel rounded-2xl p-5 border border-slate-800 overflow-hidden space-y-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <span>Matriz Financeira • {{ selectedYear }}</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold"
                    [ngClass]="activeProfile === 'CONSOLIDADO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'">
                {{ getActiveProfileLabel() }}
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              💡 Despesas sincronizadas com o Catálogo • Arraste pelo ícone ⠿ para reordenar linhas.
            </p>
          </div>

          <button (click)="toggleCatalogDrawer()" class="text-xs text-purple-400 hover:text-purple-300 font-mono font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer">
            <span>📑 Abrir Gerenciador de Catálogo</span>
            <span>→</span>
          </button>
        </div>

        <!-- The Interactive Matrix Table (Individual Months Side-by-Side) -->
        <div class="overflow-x-auto border border-slate-800/80 rounded-xl max-h-[640px] overflow-y-auto">
          <table class="w-full text-left text-xs border-collapse font-sans">
            
            <!-- Table Header: Separate Column for Each Individual Month -->
            <thead class="sticky top-0 z-20 bg-slate-900/95 backdrop-blur text-slate-300 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th class="p-2 border-r border-slate-800 w-16 text-center text-slate-500">Ordem</th>
                <th class="p-3 border-r border-slate-800 w-24 text-center">Usuário</th>
                <th class="p-3 border-r border-slate-800 min-w-[200px]">Descrição da Despesa</th>
                
                @for (m of displayedMonths; track m.id) {
                  <th class="p-2.5 border-r border-slate-800 min-w-[140px] text-right bg-emerald-950/20 text-emerald-300 font-bold">
                    <div class="text-xs">{{ m.monthName }}</div>
                    <div class="text-[9px] font-normal text-slate-400 font-mono">{{ m.yearMonth }}</div>
                  </th>
                }
                
                <th class="p-3 text-center w-24">Ações</th>
              </tr>
            </thead>

            <!-- Table Body: Categorized Expense Rows with Drag & Drop -->
            <tbody class="divide-y divide-slate-800/60 font-mono">
              @for (item of getVisibleExpenseRows(); track item.id; let rowIdx = $index) {
                <tr (dragover)="onDragOver($event, rowIdx)"
                    (dragleave)="onDragLeave($event, rowIdx)"
                    (drop)="onDrop($event, rowIdx)"
                    (dragend)="onDragEnd()"
                    class="transition group select-none"
                    [ngClass]="{
                      'opacity-30 bg-emerald-950/30 border-2 border-dashed border-emerald-500': draggedRowIndex === rowIdx,
                      'border-t-2 border-emerald-400 bg-slate-800/90 shadow-lg': dragOverRowIndex === rowIdx && draggedRowIndex !== rowIdx,
                      'hover:bg-slate-900/50': draggedRowIndex !== rowIdx
                    }">
                  
                  <!-- Row Number & Drag Handle / Ordering Controls -->
                  <td class="p-1 border-r border-slate-800 text-center select-none"
                      [title]="'Arraste pelo ícone ⠿ ou use ▲/▼ para reordenar'">
                    <div class="flex items-center justify-center gap-1">
                      
                      <!-- Drag Handle Icon -->
                      <span draggable="true"
                            (dragstart)="onDragStart($event, rowIdx)"
                            class="cursor-grab active:cursor-grabbing text-slate-500 hover:text-emerald-400 font-mono text-base px-0.5 leading-none transition">
                        ⠿
                      </span>

                      <!-- Row Number -->
                      <span class="text-slate-500 text-[10px] w-3 font-mono font-bold">{{ rowIdx + 1 }}</span>

                      <!-- Up / Down Buttons -->
                      <div class="flex flex-col">
                        <button (click)="moveRowUp(rowIdx)" [disabled]="rowIdx === 0"
                                class="text-[9px] text-slate-500 hover:text-emerald-400 disabled:opacity-20 leading-none px-0.5 py-0.5 hover:bg-slate-800 rounded" title="Mover linha para cima">
                          ▲
                        </button>
                        <button (click)="moveRowDown(rowIdx)" [disabled]="rowIdx === getVisibleExpenseRows().length - 1"
                                class="text-[9px] text-slate-500 hover:text-emerald-400 disabled:opacity-20 leading-none px-0.5 py-0.5 hover:bg-slate-800 rounded" title="Mover linha para baixo">
                          ▼
                        </button>
                      </div>

                    </div>
                  </td>

                  <!-- User Tag / Responsável -->
                  <td class="p-1.5 border-r border-slate-800 text-center">
                    <button (click)="cycleOwner(item)" 
                            [disabled]="activeProfile !== 'CONSOLIDADO'"
                            [title]="'Clique para alternar responsável (Atual: ' + item.owner + ')'"
                            class="px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                            [ngClass]="getOwnerBadgeClass(item.owner)">
                      {{ getOwnerLabel(item.owner) }}
                    </button>
                  </td>

                  <!-- Expense Description & Category (Directly Editable & Persisted) -->
                  <td class="p-2 border-r border-slate-800 font-sans">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" [ngClass]="getCategoryColor(item.category)"></span>
                      <input type="text" [ngModel]="item.description" (ngModelChange)="onExpenseDescriptionChange(item, $event)"
                             placeholder="Descrição da despesa..."
                             class="w-full bg-transparent text-slate-200 text-xs px-1.5 py-1 rounded hover:bg-slate-950 focus:bg-slate-950 focus:border-emerald-500 focus:outline-none border border-transparent font-medium" />
                    </div>
                  </td>

                  <!-- Values for Each Individual Displayed Month (Directly Inline Editable) -->
                  @for (m of displayedMonths; track m.id) {
                    <td class="p-1.5 border-r border-slate-800 text-right bg-emerald-950/5">
                      <input type="number" step="0.01"
                             [ngModel]="getMonthlyExpenseValue(m, item)"
                             (ngModelChange)="setMonthlyExpenseValue(m, item, $event)"
                             placeholder="-"
                             class="w-full text-right bg-transparent text-slate-100 px-1.5 py-1 rounded hover:bg-slate-950 focus:bg-slate-950 focus:border-emerald-500 focus:outline-none border border-transparent font-mono text-xs font-semibold placeholder:text-slate-600" />
                    </td>
                  }

                  <!-- Actions: Delete Row -->
                  <td class="p-1.5 text-center">
                    <button (click)="removeExpenseRow(item)" 
                            title="Remover linha"
                            class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition text-sm p-1 hover:bg-slate-800 rounded cursor-pointer">
                      ✕
                    </button>
                  </td>

                </tr>
              }

              <!-- Add New Expense Row (Pulls Default Value & Category Directly from the Catalog) -->
              <tr class="bg-slate-950/50 border-t-2 border-slate-800">
                <td class="p-2 border-r border-slate-800 text-center text-emerald-500 font-bold">+</td>
                
                <td class="p-1 border-r border-slate-800 text-center">
                  <select [(ngModel)]="newRowOwner" class="bg-slate-900 border border-slate-800 text-[10px] text-slate-200 rounded px-1.5 py-1 focus:outline-none">
                    @for (mem of members; track mem.id) {
                      <option [value]="mem.name">{{ mem.icon }} {{ mem.name }}</option>
                    }
                    <option value="Compartilhado">🏠 Compartilhado</option>
                  </select>
                </td>

                <td class="p-2 border-r border-slate-800 font-sans">
                  <div class="flex items-center gap-2 flex-wrap">
                    <input type="text" [(ngModel)]="newRowDesc" (ngModelChange)="onNewRowDescChange($event)" (keyup.enter)="addNewExpenseRow()"
                           placeholder="Descrição (selecione do catálogo)..."
                           list="knownExpenseDescriptions"
                           class="flex-1 min-w-[160px] bg-slate-900/80 text-slate-200 text-xs px-2 py-1.5 rounded border border-slate-800 focus:border-purple-500 focus:outline-none" />
                    
                    <datalist id="knownExpenseDescriptions">
                      @for (item of catalogExpenses; track item.id) {
                        <option [value]="item.description">{{ item.owner }} • R$ {{ item.defaultAmount | number:'1.2-2' }}</option>
                      }
                    </datalist>

                    <!-- Scope selection: Replicate for next months vs Only current month vs All 12 months -->
                    <select [(ngModel)]="newRowReplicationMode" 
                            title="Defina se o valor padrão desta despesa deve ser replicado para os próximos meses ou apenas no mês atual"
                            class="bg-slate-900 border border-slate-700/80 text-[10px] text-purple-300 font-bold rounded px-2 py-1 focus:outline-none focus:border-purple-400">
                      <option value="REPLICATE_FORWARD">🔁 Replicar nos próximos meses</option>
                      <option value="CURRENT_ONLY">📅 Apenas no mês atual ({{ primaryDisplayedMonth.monthName }})</option>
                      <option value="ALL_MONTHS">🗓️ Todos os 12 meses</option>
                    </select>

                    @if (getCatalogItemByDesc(newRowDesc)) {
                      <span class="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap" title="Valor padrão definido no Catálogo de Despesas">
                        Padrão: R$ {{ getCatalogItemByDesc(newRowDesc)?.defaultAmount | number:'1.2-2' }}
                      </span>
                    }
                  </div>
                </td>
                
                @for (m of displayedMonths; track m.id) {
                  <td class="p-2 border-r border-slate-800 text-right font-mono text-[10px]">
                    @if (getCatalogItemByDesc(newRowDesc)) {
                      @if (newRowReplicationMode === 'ALL_MONTHS' || (newRowReplicationMode === 'REPLICATE_FORWARD' && m.monthIndex >= primaryDisplayedMonth.monthIndex) || (newRowReplicationMode === 'CURRENT_ONLY' && m.monthIndex === primaryDisplayedMonth.monthIndex)) {
                        <span class="text-emerald-400 font-bold">R$ {{ getCatalogItemByDesc(newRowDesc)?.defaultAmount | number:'1.2-2' }}</span>
                      } @else {
                        <span class="text-slate-600">R$ 0,00</span>
                      }
                    } @else {
                      <span class="text-slate-600">-</span>
                    }
                  </td>
                }

                <td class="p-2 text-center">
                  <button (click)="addNewExpenseRow()" [disabled]="!newRowDesc.trim()"
                          class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-[10px] font-bold shadow transition">
                    + Inserir
                  </button>
                </td>
              </tr>

              <!-- ========================================================= -->
              <!-- 1. SEÇÃO DE TOTAL DE GASTOS -->
              <!-- ========================================================= -->
              <tr class="bg-slate-900/90 font-bold border-t-2 border-slate-700 text-xs">
                <td class="p-2.5 border-r border-slate-800 text-center text-slate-500 font-mono">∑</td>
                <td class="p-2.5 border-r border-slate-800 text-center font-mono text-[10px] text-slate-400 uppercase">
                  {{ activeProfile === 'CONSOLIDADO' ? 'TODOS' : activeProfile }}
                </td>
                <td class="p-2.5 border-r border-slate-800 text-rose-400 font-sans tracking-wide uppercase">
                  Total de Gastos ({{ activeProfile === 'CONSOLIDADO' ? 'Consolidado' : activeProfile }})
                </td>
                @for (m of displayedMonths; track m.id) {
                  <td class="p-2.5 border-r border-slate-800 text-right font-mono text-rose-400 text-xs bg-rose-950/20 font-bold">
                    R$ {{ getProfileTotalExpenses(m) | number:'1.2-2' }}
                  </td>
                }
                <td></td>
              </tr>

              <!-- ========================================================= -->
              <!-- 2. SEÇÃO DE RENDIMENTOS (ENTRADAS) -->
              <!-- ========================================================= -->
              @for (mem of members; track mem.id) {
                @if (activeProfile === 'CONSOLIDADO' || activeProfile === mem.id) {
                  <tr class="bg-slate-900/80 border-t border-slate-800/90 text-xs">
                    <td class="p-2 border-r border-slate-800 text-center font-mono">{{ mem.icon }}</td>
                    <td class="p-2 border-r border-slate-800 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" [ngClass]="getMemberBadgeClass(mem)">
                        {{ mem.name }}
                      </span>
                    </td>
                    <td class="p-2 border-r border-slate-800 font-sans font-medium" [ngClass]="getMemberTextColor(mem)">
                      Rendimentos {{ mem.name }} (Salário / Entradas)
                    </td>
                    @for (m of displayedMonths; track m.id) {
                      <td class="p-1.5 border-r border-slate-800 text-right" [ngClass]="getMemberBgClass(mem)">
                        <input type="number" step="0.01"
                               [ngModel]="getIncomeForMember(m, mem)"
                               (ngModelChange)="onIncomeChange(m, mem, $event)"
                               class="w-full text-right bg-transparent font-bold font-mono px-1.5 py-1 rounded hover:bg-slate-950 focus:bg-slate-950 focus:outline-none border border-transparent text-xs"
                               [ngClass]="getMemberTextColor(mem)" />
                      </td>
                    }
                    <td></td>
                  </tr>
                }
              }

              @if (activeProfile === 'CONSOLIDADO') {
                <tr class="bg-slate-950/40 text-[11px] border-t border-slate-800/40 hover:bg-slate-900/30">
                  <td class="p-1.5 border-r border-slate-800 text-center text-indigo-400 font-mono">+</td>
                  <td class="p-1.5 border-r border-slate-800 text-center font-mono"></td>
                  <td class="p-1.5 border-r border-slate-800">
                    <button (click)="openMemberManagerModal()" class="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 cursor-pointer">
                      <span>+ Adicionar ou Gerenciar Membros da Família</span>
                    </button>
                  </td>
                  <td [attr.colspan]="displayedMonths.length + 1"></td>
                </tr>
              }

              @if (activeProfile === 'CONSOLIDADO') {
                <tr class="bg-slate-900/95 border-t border-slate-800 font-bold text-xs">
                  <td class="p-2 border-r border-slate-800 text-center text-teal-400 font-mono">↓</td>
                  <td class="p-2 border-r border-slate-800 text-center font-mono text-[10px] text-teal-400 uppercase">
                    TOTAL
                  </td>
                  <td class="p-2 border-r border-slate-800 text-teal-300 font-sans uppercase">
                    Total de Rendimentos ({{ getMembersSummaryLabel() }})
                  </td>
                  @for (m of displayedMonths; track m.id) {
                    <td class="p-2 border-r border-slate-800 text-right font-mono text-teal-300 font-extrabold text-xs bg-teal-950/30">
                      R$ {{ getProfileIncome(m) | number:'1.2-2' }}
                    </td>
                  }
                  <td></td>
                </tr>
              }

              <!-- ========================================================= -->
              <!-- 3. SEÇÃO DE CAPITAL DE GIRO (EXCLUSIVAMENTE VALOR RESIDUAL) -->
              <!-- ========================================================= -->
              @for (mem of members; track mem.id) {
                @if (activeProfile === 'CONSOLIDADO' || activeProfile === mem.id) {
                  <tr class="bg-slate-900/60 border-t border-slate-800 text-xs">
                    <td class="p-2 border-r border-slate-800 text-center text-amber-400 font-mono">🏦</td>
                    <td class="p-2 border-r border-slate-800 text-center">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        GIRO {{ mem.name }}
                      </span>
                    </td>
                    <td class="p-2 border-r border-slate-800 font-sans">
                      <span class="text-amber-300 font-medium">Capital de Giro {{ mem.name }}</span>
                    </td>
                    @for (m of displayedMonths; track m.id) {
                      <td class="p-2 border-r border-slate-800 text-right bg-amber-950/10 font-mono text-xs font-bold text-amber-300">
                        R$ {{ getFinalCapitalGiroForMember(m, mem) | number:'1.2-2' }}
                      </td>
                    }
                    <td></td>
                  </tr>
                }
              }

              @if (activeProfile === 'CONSOLIDADO') {
                <tr class="bg-slate-900/70 border-t border-slate-800 font-bold text-xs">
                  <td class="p-2 border-r border-slate-800 text-center text-amber-400 font-mono">🏦</td>
                  <td class="p-2 border-r border-slate-800 text-center font-mono text-[10px] text-amber-400 uppercase">
                    GIRO FAMÍLIA
                  </td>
                  <td class="p-2 border-r border-slate-800 text-amber-300 font-sans uppercase">
                    Total Capital de Giro (Família)
                  </td>
                  @for (m of displayedMonths; track m.id) {
                    <td class="p-2 border-r border-slate-800 text-right font-mono text-amber-300 font-black text-xs bg-amber-950/20">
                      R$ {{ getProfileFinalCapitalGiro(m) | number:'1.2-2' }}
                    </td>
                  }
                  <td></td>
                </tr>
              }

              <!-- ========================================================= -->
              <!-- 4. SEÇÃO DE RESULTADO DO MÊS (LÍQUIDO: RENDIMENTOS - GASTOS) -->
              <!-- ========================================================= -->
              <tr class="bg-slate-900/80 border-t border-slate-800 font-bold">
                <td class="p-2.5 border-r border-slate-800 text-center font-mono">📊</td>
                <td class="p-2.5 border-r border-slate-800 text-center font-mono text-[10px] text-slate-400 uppercase">
                  {{ activeProfile === 'CONSOLIDADO' ? 'LÍQUIDO' : getActiveProfileName() }}
                </td>
                <td class="p-2.5 border-r border-slate-800 font-sans tracking-wide">
                  Resultado do Mês ({{ activeProfile === 'CONSOLIDADO' ? 'Consolidado' : getActiveProfileName() }})
                </td>
                @for (m of displayedMonths; track m.id) {
                  <td class="p-2.5 border-r border-slate-800 text-right font-mono text-xs font-black"
                      [ngClass]="getProfileResultado(m) >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                    {{ getProfileResultado(m) >= 0 ? '+' : '' }}R$ {{ getProfileResultado(m) | number:'1.2-2' }}
                  </td>
                }
                <td></td>
              </tr>

              <!-- ========================================================= -->
              <!-- 5. SEÇÃO DE CAIXA FINAL (RESERVA DE EMERGÊNCIA EDITÁVEL + FLUXO CUMULATIVO) -->
              <!-- ========================================================= -->
              @for (mem of members; track mem.id) {
                @if (activeProfile === 'CONSOLIDADO' || activeProfile === mem.id) {
                  <tr class="border-t text-xs" [ngClass]="getMemberResBgClass(mem)">
                    <td class="p-2 border-r border-slate-800 text-center font-mono">🛡️</td>
                    <td class="p-2 border-r border-slate-800 text-center font-mono text-[10px] uppercase font-bold" [ngClass]="getMemberTextColor(mem)">
                      RES. {{ mem.name }}
                    </td>
                    <td class="p-2 border-r border-slate-800 font-sans font-semibold" [ngClass]="getMemberTextColor(mem)">
                      <span>Caixa Final {{ mem.name }} (Reserva de Emergência)</span>
                    </td>
                    @for (m of displayedMonths; track m.id) {
                      <td class="p-1.5 border-r border-slate-800 text-right" [ngClass]="getMemberBgClass(mem)">
                        <div class="flex flex-col items-end">
                          <input type="number" step="0.01"
                                 [ngModel]="getFinalCashForMember(selectedYear, m.monthIndex, mem)"
                                 (ngModelChange)="onFinalCashForMemberChange(selectedYear, m.monthIndex, mem, $event)"
                                 [title]="'Caixa Final ' + mem.name + ' (Ajuste afeta automaticamente os próximos meses)'"
                                 class="w-full text-right bg-transparent font-black font-mono px-1 py-0.5 rounded hover:bg-slate-950 focus:bg-slate-950 focus:outline-none border border-transparent text-xs"
                                 [ngClass]="getMemberTextColor(mem)" />
                          @if (getSurplusTransferToReserveForMember(m, mem) > 0) {
                            <div class="text-[9px] text-emerald-400 font-sans font-normal pr-1" title="Excedente de Giro transferido para a Reserva de Emergência">
                              +R$ {{ getSurplusTransferToReserveForMember(m, mem) | number:'1.2-2' }} do giro
                            </div>
                          } @else if (getResultadoForMember(m, mem) < 0 && getDeficitCoveredByReserveForMember(m, mem) === 0) {
                            <div class="text-[9px] text-emerald-400 font-sans font-normal pr-1" title="Déficit 100% absorvido pelo Capital de Giro. Reserva intacta!">
                              🛡️ Reserva Intacta
                            </div>
                          } @else if (getResultadoForMember(m, mem) < 0 && getDeficitCoveredByReserveForMember(m, mem) > 0) {
                            <div class="text-[9px] text-rose-400 font-sans font-normal pr-1" title="Giro esgotado: débito na reserva">
                              ⚠️ -R$ {{ getDeficitCoveredByReserveForMember(m, mem) | number:'1.2-2' }} da reserva
                            </div>
                          }
                        </div>
                      </td>
                    }
                    <td></td>
                  </tr>
                }
              }

              <!-- Row: Caixa Final Unificado (Reserva Familiar Total) -->
              @if (activeProfile === 'CONSOLIDADO') {
                <tr class="bg-cyan-950/50 border-t-2 border-cyan-500/40 font-black text-sm">
                  <td class="p-3 border-r border-slate-800 text-center text-cyan-400 font-mono">👑</td>
                  <td class="p-3 border-r border-slate-800 text-center font-mono text-[10px] text-cyan-300">
                    RES. FAMÍLIA
                  </td>
                  <td class="p-3 border-r border-slate-800 text-cyan-300 font-sans tracking-wide uppercase">
                    Caixa Final Unificado (Reserva Familiar = {{ getMembersSummaryLabel() }})
                  </td>
                  @for (m of displayedMonths; track m.id) {
                    <td class="p-3 border-r border-slate-800 text-right font-mono text-cyan-300 text-xs bg-cyan-950/60 font-black">
                      R$ {{ getFinalCashUnified(selectedYear, m.monthIndex) | number:'1.2-2' }}
                    </td>
                  }
                  <td></td>
                </tr>
              }

            </tbody>
          </table>
        </div>

        @if (lastSyncMessage) {
          <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono flex items-center justify-between">
            <span>✓ {{ lastSyncMessage }}</span>
            <span class="text-[10px] text-slate-400">CQRS & Event Sourcing</span>
          </div>
        }

      </div>

      <!-- AI Advisor Sidecar Drawer -->
      @if (showAiDrawer) {
        <div class="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 animate-in fade-in duration-200">
          
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold text-sm">
                AI
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">Assistente Financeiro IA Multi-Horizonte (RAG)</h3>
                <p class="text-[11px] text-slate-400">Análise de Catálogo, Capital de Giro Residual e Reservas no PostgreSQL</p>
              </div>
            </div>

            <button (click)="toggleAiDrawer()" class="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800">
              ✕ Fechar
            </button>
          </div>

          <!-- Quick Multi-Period Prompts -->
          <div class="flex flex-wrap gap-2 text-xs">
            <button (click)="askAi('Como os déficits mensais foram absorvidos pelo Capital de Giro para proteger a Reserva?')"
                    class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition">
              🛡️ <span>Absorção de Déficit pelo Giro</span>
            </button>
            <button (click)="askAi('Qual a evolução das reservas de emergência individuais e unificadas de todos os membros da família?')"
                    class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition">
              💵 <span>Evolução das Reservas</span>
            </button>
            <button (click)="askAi('Quais são as despesas cadastradas no catálogo com seus valores padrão?')"
                    class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition">
              📑 <span>Consultar Catálogo de Despesas</span>
            </button>
          </div>

          <!-- AI Chat Stream -->
          <div class="bg-slate-950/60 rounded-xl p-4 max-h-80 overflow-y-auto space-y-3 border border-slate-800">
            @for (msg of aiMessages; track msg.id) {
              <div class="space-y-1" [class.text-right]="msg.sender === 'user'">
                <div class="text-[10px] font-mono text-slate-500">
                  {{ msg.sender === 'user' ? 'VOCÊ' : 'ASSISTENTE IA' }} • {{ msg.timestamp | date:'HH:mm:ss' }}
                </div>
                <div class="p-3 rounded-xl text-xs leading-relaxed inline-block max-w-2xl text-left"
                     [ngClass]="msg.sender === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-200 border border-slate-800 whitespace-pre-line'">
                  {{ msg.content }}
                </div>
              </div>
            }

            @if (aiThinking) {
              <div class="text-xs text-teal-400 font-mono flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                <span>Consultando banco de dados e gerando análise...</span>
              </div>
            }
          </div>

          <!-- Input Bar -->
          <div class="flex items-center gap-2">
            <input type="text" [(ngModel)]="aiQuery" (keyup.enter)="sendAiQuery()"
                   placeholder="Pergunte sobre seus meses, rendimentos, reservas ou divisão de gastos..."
                   class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-sans" />
            <button (click)="sendAiQuery()" [disabled]="aiThinking || !aiQuery.trim()"
                    class="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition">
              Perguntar
            </button>
          </div>

        </div>
      }

    </div>
  `
})
export class SpreadsheetComponent implements OnInit {
  state = inject(StateService);
  api = inject(FinanceApiService);
  auth = inject(AuthService);
  cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      // Whenever authentication or tenant state changes, reload latest database data
      const tId = this.state.tenantId();
      const isAuth = this.auth.isAuthenticated();
      this.loadFromDatabase(this.selectedYear);
      this.loadCatalog();
    });
  }

  //Get actual year
  selectedYear: number = new Date().getFullYear();

  // Household Members (Dynamic Multi-User)
  members: HouseholdMember[] = [
    {
      id: 'member-1',
      name: 'Membro 1',
      icon: '👤',
      color: 'indigo',
      baseInitialReserve: 10000,
      baseInitialCapitalGiro: 5000
    }
  ];

  // Member Manager Modal State
  showMemberModal = false;
  editingMemberId: string | null = null;
  editMemberName = '';
  editMemberIcon = '👤';
  editMemberColor = 'indigo';
  editMemberBaseReserve = 0;
  editMemberBaseGiro = 0;

  newMemberName = '';
  newMemberIcon = '👤';
  newMemberColor = 'emerald';
  newMemberBaseReserve = 0;
  newMemberBaseGiro = 0;

  memberFeedbackMessage: string | null = null;
  private feedbackTimer: any = null;

  activeProfile: ProfileView = 'CONSOLIDADO';
  timeHorizon: TimeHorizon = 'MENSAL';

  // Persistence status
  saveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  lastSavedTime: Date | null = null;
  private autoSaveTimer: any = null;

  // Drag & Drop State
  draggedRowIndex: number | null = null;
  dragOverRowIndex: number | null = null;

  // Sub-period indices
  activeMonthIndex = new Date().getMonth(); // Default to current month (index 8)
  activeBimesterIndex = Math.floor(new Date().getMonth() / 2); // Default to current bimester (index 4)
  activeQuarterIndex = Math.floor(new Date().getMonth() / 3); // Default to current quarter (index 3)
  activeSemesterIndex = Math.floor(new Date().getMonth() / 6); // Default to current semester (index 1)

  showPeriodOptions = false;

  newRowDesc = '';
  newRowOwner: ExpenseOwner = 'Compartilhado';
  newRowDefaultAmount: number | null = null;
  newRowReplicationMode: 'REPLICATE_FORWARD' | 'CURRENT_ONLY' | 'ALL_MONTHS' = 'CURRENT_ONLY';
  syncing = false;
  lastSyncMessage: string | null = null;

  // Expense Catalog State (Catálogo de Despesas)
  catalogExpenses: CatalogExpense[] = [];
  showCatalogDrawer = false;
  catalogFilterOwner: ExpenseOwner | 'ALL' = 'ALL';
  newCatalogDesc = '';
  newCatalogAmount: number | null = null;
  newCatalogOwner: ExpenseOwner = 'Compartilhado';
  newCatalogCategory = 'GERAL';
  newCatalogIcon = '💳';

  editingCatalogId: string | null = null;
  editCatalogDesc = '';
  editCatalogAmount = 0;
  editCatalogOwner: ExpenseOwner = 'Compartilhado';
  editCatalogCategory = 'GERAL';
  editCatalogIcon = '💳';

  // AI Assistant State
  showAiDrawer = false;
  aiQuery = '';
  aiThinking = false;
  aiMessages: ChatMessage[] = [];

  // Multi-Year Data Store (12 Months per year)
  yearsData: Record<number, MonthSpreadsheetData[]> = {
    2026: this.buildEmptyYear(2026),
    2027: this.buildEmptyYear(2027)
  };

  // Sub-period definitions
  bimesters = [
    { id: 'b-1', title: '1º Bimestre', subtitle: 'Jan - Fev', indices: [0, 1] },
    { id: 'b-2', title: '2º Bimestre', subtitle: 'Mar - Abr', indices: [2, 3] },
    { id: 'b-3', title: '3º Bimestre', subtitle: 'Mai - Jun', indices: [4, 5] },
    { id: 'b-4', title: '4º Bimestre', subtitle: 'Jul - Ago', indices: [6, 7] },
    { id: 'b-5', title: '5º Bimestre', subtitle: 'Set - Out', indices: [8, 9] },
    { id: 'b-6', title: '6º Bimestre', subtitle: 'Nov - Dez', indices: [10, 11] }
  ];

  quarters = [
    { id: 'q-1', title: '1º Trimestre (Q1)', subtitle: 'Jan - Mar', indices: [0, 1, 2] },
    { id: 'q-2', title: '2º Trimestre (Q2)', subtitle: 'Abr - Jun', indices: [3, 4, 5] },
    { id: 'q-3', title: '3º Trimestre (Q3)', subtitle: 'Jul - Set', indices: [6, 7, 8] },
    { id: 'q-4', title: '4º Trimestre (Q4)', subtitle: 'Out - Dez', indices: [9, 10, 11] }
  ];

  semesters = [
    { id: 's-1', title: '1º Semestre', subtitle: 'Jan - Jun', indices: [0, 1, 2, 3, 4, 5] },
    { id: 's-2', title: '2º Semestre', subtitle: 'Jul - Dez', indices: [6, 7, 8, 9, 10, 11] }
  ];

  get baseInitialReserve(): number {
    return this.members.reduce((sum, mem) => sum + (Number(mem.baseInitialReserve) || 0), 0);
  }

  showGiroPopover = false;

  toggleGiroPopover() {
    this.showGiroPopover = !this.showGiroPopover;
  }

  getActiveBaseGiroTotal(): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.getTotalBaseCapitalGiro();
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? (Number(mem.baseInitialCapitalGiro) || 0) : this.getTotalBaseCapitalGiro();
  }

  getTotalBaseCapitalGiro(): number {
    return this.members.reduce((sum, mem) => sum + (Number(mem.baseInitialCapitalGiro) || 0), 0);
  }

  onMemberGiroChange(mem: HouseholdMember, val: number) {
    mem.baseInitialCapitalGiro = Number(val) || 0;
    this.triggerAutoSave();
  }

  // Member Manager Modal Methods
  openMemberManagerModal() {
    this.showMemberModal = true;
  }

  closeMemberManagerModal() {
    this.showMemberModal = false;
    this.editingMemberId = null;
    this.memberFeedbackMessage = null;
  }

  showMemberFeedback(msg: string) {
    this.memberFeedbackMessage = msg;
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.memberFeedbackMessage = null;
      this.cdr.markForCheck();
    }, 4000);
  }

  startEditMember(mem: HouseholdMember) {
    this.editingMemberId = mem.id;
    this.editMemberName = mem.name;
    this.editMemberIcon = mem.icon;
    this.editMemberColor = mem.color;
    this.editMemberBaseReserve = mem.baseInitialReserve;
    this.editMemberBaseGiro = mem.baseInitialCapitalGiro;
  }

  cancelEditMember() {
    this.editingMemberId = null;
  }

  saveEditMember() {
    if (!this.editingMemberId || !this.editMemberName.trim()) return;
    const mem = this.members.find(m => m.id === this.editingMemberId);
    if (mem) {
      const oldName = mem.name;
      mem.name = this.editMemberName.trim();
      mem.icon = this.editMemberIcon;
      mem.color = this.editMemberColor;
      mem.baseInitialReserve = Number(this.editMemberBaseReserve) || 0;
      mem.baseInitialCapitalGiro = Number(this.editMemberBaseGiro) || 0;

      // If name changed, rename expenses
      if (oldName !== mem.name) {
        for (const y in this.yearsData) {
          for (const m of this.yearsData[y]) {
            for (const e of m.expenses) {
              if (e.owner === oldName) e.owner = mem.name;
            }
          }
        }
      }
      this.members = [...this.members];
      this.editingMemberId = null;
      this.showMemberFeedback(`Membro "${mem.name}" atualizado com sucesso!`);
      this.triggerAutoSave();
      this.cdr.markForCheck();
    }
  }

  addMember() {
    const name = this.newMemberName.trim();
    if (!name) return;

    const newMem: HouseholdMember = {
      id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: name,
      icon: this.newMemberIcon || '👤',
      color: this.newMemberColor || 'emerald',
      baseInitialReserve: Number(this.newMemberBaseReserve) || 0,
      baseInitialCapitalGiro: Number(this.newMemberBaseGiro) || 0
    };

    // Reassign array reference for OnPush change detection & dynamic tabs
    this.members = [...this.members, newMem];

    // Ensure all months in all years have this member's entries initialized
    for (const y in this.yearsData) {
      for (const m of this.yearsData[y]) {
        if (!m.userIncomes) m.userIncomes = {};
        if (m.userIncomes[newMem.id] === undefined) {
          m.userIncomes[newMem.id] = 0;
        }
        if (!m.userCapitalGiro) m.userCapitalGiro = {};
        if (m.userCapitalGiro[newMem.id] === undefined) {
          m.userCapitalGiro[newMem.id] = newMem.baseInitialCapitalGiro;
        }
        if (!m.userInitialCash) m.userInitialCash = {};
        if (m.userInitialCash[newMem.id] === undefined) {
          m.userInitialCash[newMem.id] = newMem.baseInitialReserve;
        }
      }
    }

    this.newMemberName = '';
    this.newMemberBaseReserve = 0;
    this.newMemberBaseGiro = 0;
    this.showMemberFeedback(`Membro "${newMem.name}" adicionado com sucesso!`);
    this.triggerAutoSave();
    this.cdr.markForCheck();
  }

  removeMember(mem: HouseholdMember) {
    if (this.members.length <= 1) return;
    if (confirm(`Tem certeza que deseja remover o membro "${mem.name}"?`)) {
      this.members = this.members.filter(m => m.id !== mem.id);
      if (this.activeProfile === mem.id) {
        this.setProfile('CONSOLIDADO');
      }
      this.showMemberFeedback(`Membro "${mem.name}" removido.`);
      this.triggerAutoSave();
      this.cdr.markForCheck();
    }
  }

  // Styling & UI Label Helpers
  getProfileButtonActiveClass(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'bg-indigo-600 text-white font-semibold shadow-sm';
      case 'purple': return 'bg-purple-600 text-white font-semibold shadow-sm';
      case 'emerald': return 'bg-emerald-600 text-white font-semibold shadow-sm';
      case 'amber': return 'bg-amber-600 text-white font-semibold shadow-sm';
      case 'rose': return 'bg-rose-600 text-white font-semibold shadow-sm';
      case 'sky': return 'bg-sky-600 text-white font-semibold shadow-sm';
      case 'cyan': return 'bg-cyan-600 text-white font-semibold shadow-sm';
      default: return 'bg-indigo-600 text-white font-semibold shadow-sm';
    }
  }

  getMemberBadgeClass(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      case 'purple': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'emerald': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'amber': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'rose': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'sky': return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
      case 'cyan': return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      default: return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
  }

  getMemberTextColor(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'text-indigo-400';
      case 'purple': return 'text-purple-400';
      case 'emerald': return 'text-emerald-400';
      case 'amber': return 'text-amber-400';
      case 'rose': return 'text-rose-400';
      case 'sky': return 'text-sky-400';
      case 'cyan': return 'text-cyan-400';
      default: return 'text-indigo-400';
    }
  }

  getMemberBgClass(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'bg-indigo-950/20';
      case 'purple': return 'bg-purple-950/20';
      case 'emerald': return 'bg-emerald-950/20';
      case 'amber': return 'bg-amber-950/20';
      case 'rose': return 'bg-rose-950/20';
      case 'sky': return 'bg-sky-950/20';
      case 'cyan': return 'bg-cyan-950/20';
      default: return 'bg-indigo-950/20';
    }
  }

  getMemberResBgClass(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'bg-indigo-950/30 border-indigo-500/20';
      case 'purple': return 'bg-purple-950/30 border-purple-500/20';
      case 'emerald': return 'bg-emerald-950/30 border-emerald-500/20';
      case 'amber': return 'bg-amber-950/30 border-amber-500/20';
      case 'rose': return 'bg-rose-950/30 border-rose-500/20';
      case 'sky': return 'bg-sky-950/30 border-sky-500/20';
      case 'cyan': return 'bg-cyan-950/30 border-cyan-500/20';
      default: return 'bg-indigo-950/30 border-indigo-500/20';
    }
  }

  getOwnerBadgeClass(owner: ExpenseOwner): string {
    if (owner === 'Compartilhado') {
      return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
    }
    const mem = this.members.find(m => m.name === owner || m.id === owner);
    if (mem) {
      return this.getMemberBadgeClass(mem);
    }
    return 'bg-slate-800 text-slate-300 border border-slate-700';
  }

  getOwnerLabel(owner: ExpenseOwner): string {
    if (owner === 'Compartilhado') return '🏠 Compartilhado';
    const mem = this.members.find(m => m.name === owner || m.id === owner);
    return mem ? `${mem.icon} ${mem.name}` : owner;
  }

  getActiveProfileLabel(): string {
    if (this.activeProfile === 'CONSOLIDADO') return '👥 Consolidado (Família)';
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? `${mem.icon} ${mem.name}` : this.activeProfile;
  }

  getActiveProfileName(): string {
    if (this.activeProfile === 'CONSOLIDADO') return 'Consolidado';
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? mem.name : this.activeProfile;
  }

  getMembersSummaryLabel(): string {
    return this.members.map(m => m.name).join(' + ');
  }

  get filteredCatalogExpenses(): CatalogExpense[] {
    if (this.catalogFilterOwner === 'ALL') {
      return this.catalogExpenses;
    }
    return this.catalogExpenses.filter(e => e.owner === this.catalogFilterOwner);
  }

  getCatalogCountByOwner(owner: ExpenseOwner): number {
    return this.catalogExpenses.filter(e => e.owner === owner).length;
  }

  getProfileCatalogSuggestions(): CatalogExpense[] {
    const activeMember = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    if (activeMember) {
      return this.catalogExpenses.filter(c => c.owner === activeMember.name);
    }
    return this.catalogExpenses;
  }

  ngOnInit() {
    this.loadFromLocalCache();
    this.loadFromDatabase(this.selectedYear);
    this.loadCatalog();
  }

  // Expense Catalog Management
  loadCatalog() {
    const tId = this.state.tenantId();
    this.api.getCatalogExpenses(tId).subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.catalogExpenses = [...items];
          this.saveCatalogToLocalCache();
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Fallback to local cache
      }
    });
  }

  toggleCatalogDrawer() {
    this.showCatalogDrawer = !this.showCatalogDrawer;
    if (this.showCatalogDrawer) {
      const activeMember = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
      if (activeMember) {
        this.newCatalogOwner = activeMember.name;
        this.catalogFilterOwner = activeMember.name;
      } else {
        this.newCatalogOwner = 'Compartilhado';
        this.catalogFilterOwner = 'ALL';
      }
      if (this.catalogExpenses.length === 0) {
        this.loadCatalog();
      }
    }
  }

  createCatalogItem() {
    const desc = this.newCatalogDesc.trim();
    if (!desc) return;

    const payload: Partial<CatalogExpense> = {
      id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      description: desc,
      defaultAmount: Number(this.newCatalogAmount) || 0,
      owner: this.newCatalogOwner,
      category: this.newCatalogCategory,
      icon: this.newCatalogIcon || '💳'
    };

    this.api.createCatalogExpense(this.state.tenantId(), payload).subscribe({
      next: (created) => {
        this.catalogExpenses.push(created);
        this.saveCatalogToLocalCache();
        this.newCatalogDesc = '';
        this.newCatalogAmount = null;
      },
      error: () => {
        // Optimistic local add
        this.catalogExpenses.push(payload as CatalogExpense);
        this.saveCatalogToLocalCache();
        this.newCatalogDesc = '';
        this.newCatalogAmount = null;
      }
    });
  }

  startEditCatalogItem(item: CatalogExpense) {
    this.editingCatalogId = item.id;
    this.editCatalogDesc = item.description;
    this.editCatalogAmount = item.defaultAmount;
    this.editCatalogOwner = item.owner;
    this.editCatalogCategory = item.category || 'GERAL';
    this.editCatalogIcon = item.icon || '💳';
  }

  cancelEditCatalogItem() {
    this.editingCatalogId = null;
  }

  saveEditCatalogItem(item: CatalogExpense) {
    const desc = this.editCatalogDesc.trim();
    if (!desc) return;

    const updated: Partial<CatalogExpense> = {
      description: desc,
      defaultAmount: Number(this.editCatalogAmount) || 0,
      owner: this.editCatalogOwner,
      category: this.editCatalogCategory,
      icon: this.editCatalogIcon
    };

    this.api.updateCatalogExpense(this.state.tenantId(), item.id, updated).subscribe({
      next: (res) => {
        item.description = res.description;
        item.defaultAmount = res.defaultAmount;
        item.owner = res.owner;
        item.category = res.category;
        item.icon = res.icon;
        this.editingCatalogId = null;
        this.saveCatalogToLocalCache();
      },
      error: () => {
        item.description = desc;
        item.defaultAmount = Number(this.editCatalogAmount) || 0;
        item.owner = this.editCatalogOwner;
        item.category = this.editCatalogCategory;
        item.icon = this.editCatalogIcon;
        this.editingCatalogId = null;
        this.saveCatalogToLocalCache();
      }
    });
  }

  deleteCatalogItem(item: CatalogExpense) {
    this.api.deleteCatalogExpense(this.state.tenantId(), item.id).subscribe({
      next: () => {
        this.catalogExpenses = this.catalogExpenses.filter(c => c.id !== item.id);
        this.saveCatalogToLocalCache();
      },
      error: () => {
        this.catalogExpenses = this.catalogExpenses.filter(c => c.id !== item.id);
        this.saveCatalogToLocalCache();
      }
    });
  }

  insertCatalogItemIntoMonth(item: CatalogExpense, month: MonthSpreadsheetData) {
    this.setMonthlyExpenseValue(month, item, item.defaultAmount);
    this.triggerAutoSave();
  }

  insertCatalogItemIntoForwardMonths(item: CatalogExpense, fromMonth: MonthSpreadsheetData) {
    const fromIdx = fromMonth.monthIndex;
    for (const m of this.currentYearMonths) {
      if (m.monthIndex >= fromIdx) {
        this.setMonthlyExpenseValue(m, item, item.defaultAmount);
      }
    }
    this.triggerAutoSave();
  }

  insertCatalogItemIntoAllMonths(item: CatalogExpense) {
    for (const m of this.currentYearMonths) {
      this.setMonthlyExpenseValue(m, item, item.defaultAmount);
    }
    this.triggerAutoSave();
  }

  fillFromCatalog(item: CatalogExpense) {
    this.newRowDesc = item.description;
    this.newRowDefaultAmount = item.defaultAmount;
    this.newRowOwner = item.owner;
    this.addNewExpenseRow();
  }

  saveRowToCatalog(item: { id: string; description: string; category: string; owner: ExpenseOwner }, fromMonth: MonthSpreadsheetData) {
    const val = this.getMonthlyExpenseValue(fromMonth, item) ?? 0;
    const existing = this.catalogExpenses.find(c => c.description.toLowerCase() === item.description.toLowerCase());

    if (existing) {
      existing.defaultAmount = val;
      existing.owner = item.owner;
      existing.category = item.category;
      this.api.updateCatalogExpense(this.state.tenantId(), existing.id, existing).subscribe();
    } else {
      const newCat: Partial<CatalogExpense> = {
        id: 'cat-' + Date.now(),
        description: item.description,
        defaultAmount: val,
        owner: item.owner,
        category: item.category || 'GERAL',
        icon: '💳'
      };
      this.api.createCatalogExpense(this.state.tenantId(), newCat).subscribe({
        next: (created) => {
          this.catalogExpenses.push(created);
          this.saveCatalogToLocalCache();
        }
      });
    }
    this.saveCatalogToLocalCache();
  }

  private saveCatalogToLocalCache() {
    try {
      localStorage.setItem('pf_catalog_expenses', JSON.stringify(this.catalogExpenses));
    } catch {
      // Local storage error
    }
  }


  get currentYearMonths(): MonthSpreadsheetData[] {
    if (!this.yearsData[this.selectedYear] || this.yearsData[this.selectedYear].length === 0) {
      this.yearsData[this.selectedYear] = this.buildEmptyYear(this.selectedYear);
    }
    return this.yearsData[this.selectedYear];
  }

  get displayedMonths(): MonthSpreadsheetData[] {
    const months = this.currentYearMonths;
    if (!months || months.length === 0) {
      return this.buildEmptyYear(this.selectedYear);
    }
    switch (this.timeHorizon) {
      case 'MENSAL':
        return [months[this.activeMonthIndex] || months[0]];

      case 'BIMESTRAL': {
        const b = this.bimesters[this.activeBimesterIndex] || this.bimesters[4];
        return b.indices.map(i => months[i]).filter(Boolean);
      }

      case 'TRIMESTRAL': {
        const q = this.quarters[this.activeQuarterIndex] || this.quarters[3];
        return q.indices.map(i => months[i]).filter(Boolean);
      }

      case 'SEMESTRAL': {
        const s = this.semesters[this.activeSemesterIndex] || this.semesters[1];
        return s.indices.map(i => months[i]).filter(Boolean);
      }

      case 'ANUAL':
        return months;
    }
  }

  get primaryDisplayedMonth(): MonthSpreadsheetData {
    return this.displayedMonths[0] || this.currentYearMonths[0] || this.buildEmptyYear(this.selectedYear)[0];
  }

  setProfile(profile: ProfileView) {
    this.activeProfile = profile;
    const mem = this.members.find(m => m.id === profile || m.name.toUpperCase() === profile.toUpperCase());
    if (mem) {
      this.newRowOwner = mem.name;
    } else {
      this.newRowOwner = 'Compartilhado';
    }
    try {
      localStorage.setItem('pf_active_profile', profile);
    } catch {
      // Ignore localStorage error
    }
  }

  getTimeHorizonLabel(horizon: TimeHorizon): string {
    switch (horizon) {
      case 'MENSAL': return '📅 Mês (1 Mês)';
      case 'BIMESTRAL': return '🌓 Bimestral (2 Meses)';
      case 'TRIMESTRAL': return '📊 Trimestral (3 Meses)';
      case 'SEMESTRAL': return '📈 Semestral (6 Meses)';
      case 'ANUAL': return '🗓️ Ano Completo (12 Meses)';
    }
  }

  setTimeHorizon(h: TimeHorizon) {
    this.timeHorizon = h;
    try {
      localStorage.setItem('pf_time_horizon', h);
    } catch {
      // Ignore localStorage error
    }
  }

  changeYear(year: number) {
    if (year < 2020 || year > 2040) return;
    this.triggerImmediateSave();
    this.selectedYear = year;
    if (!this.yearsData[year]) {
      this.yearsData[year] = this.buildEmptyYear(year);
    }
    this.loadFromDatabase(year);
  }

  onCapitalGiroForMemberChange(month: MonthSpreadsheetData, member: HouseholdMember, val: number) {
    const newVal = Number(val) || 0;
    member.baseInitialCapitalGiro = newVal;
    if (month.monthIndex === 0) {
      if (!month.userCapitalGiro) month.userCapitalGiro = {};
      month.userCapitalGiro[member.id] = newVal;
      month.isInitialGiroManual = true;
      month.capitalGiro = this.members.reduce((sum, m) => sum + this.getInitialCapitalGiroForMember(month, m), 0);
    }
    this.triggerAutoSave();
  }

  // =========================================================================
  // CAPITAL DE GIRO RESIDUAL DINÂMICO (CUMULATIVO COM TETO E TRANSFERÊNCIA DE EXCESSO)
  // =========================================================================
  getCapCapitalGiroForMember(member: HouseholdMember): number {
    return Number(member.baseInitialCapitalGiro) || 0;
  }

  getInitialCapitalGiroForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    if (month.monthIndex === 0) {
      if (month.userCapitalGiro && month.userCapitalGiro[member.id] !== undefined && month.isInitialGiroManual) {
        return this.round2(Number(month.userCapitalGiro[member.id]));
      }
      return this.getCapCapitalGiroForMember(member);
    }
    const prevMonth = this.yearsData[month.year]?.[month.monthIndex - 1];
    if (prevMonth) {
      return this.getFinalCapitalGiroForMember(prevMonth, member);
    }
    return this.getCapCapitalGiroForMember(member);
  }

  getRawCapitalGiroForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    return this.round2(this.getInitialCapitalGiroForMember(month, member) + this.getResultadoForMember(month, member));
  }

  getFinalCapitalGiroForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    const raw = this.getRawCapitalGiroForMember(month, member);
    const cap = this.getCapCapitalGiroForMember(member);
    return this.round2(Math.max(0, Math.min(cap, raw)));
  }

  getSurplusTransferToReserveForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    const raw = this.getRawCapitalGiroForMember(month, member);
    const cap = this.getCapCapitalGiroForMember(member);
    return this.round2(raw > cap ? raw - cap : 0);
  }

  getDeficitCoveredByReserveForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    const raw = this.getRawCapitalGiroForMember(month, member);
    return this.round2(raw < 0 ? Math.abs(raw) : 0);
  }

  getProfileInitialCapitalGiro(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.members.reduce((sum, mem) => sum + this.getInitialCapitalGiroForMember(month, mem), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getInitialCapitalGiroForMember(month, mem) : 0;
  }

  getProfileFinalCapitalGiro(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.members.reduce((sum, mem) => sum + this.getFinalCapitalGiroForMember(month, mem), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getFinalCapitalGiroForMember(month, mem) : 0;
  }

  // Drag and Drop Implementation
  onDragStart(event: DragEvent, index: number) {
    this.draggedRowIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverRowIndex = index;
  }

  onDragLeave(event: DragEvent, index: number) {
    if (this.dragOverRowIndex === index) {
      this.dragOverRowIndex = null;
    }
  }

  onDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    const sourceIndex = this.draggedRowIndex;
    this.draggedRowIndex = null;
    this.dragOverRowIndex = null;

    if (sourceIndex === null || sourceIndex === undefined || sourceIndex === targetIndex) {
      return;
    }

    const rows = this.getVisibleExpenseRows();
    const draggedItem = rows[sourceIndex];
    if (!draggedItem) return;

    // Build reordered row list
    const reordered = [...rows];
    reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    // Apply the exact reordered sequence to all months in the year
    for (const m of this.currentYearMonths) {
      const newExpenses: SpreadsheetExpenseItem[] = [];
      for (const r of reordered) {
        const exp = m.expenses.find(e => (r.id && e.id === r.id) || e.description.toLowerCase() === r.description.toLowerCase());
        if (exp) {
          newExpenses.push(exp);
        }
      }
      for (const exp of m.expenses) {
        if (!newExpenses.some(ne => (ne.id && ne.id === exp.id) || ne.description.toLowerCase() === exp.description.toLowerCase())) {
          newExpenses.push(exp);
        }
      }
      m.expenses = newExpenses;
    }

    this.triggerAutoSave();
  }

  onDragEnd() {
    this.draggedRowIndex = null;
    this.dragOverRowIndex = null;
  }

  // Row Reordering (Move Up / Move Down)
  moveRowUp(rowIdx: number) {
    if (rowIdx <= 0) return;
    this.swapRows(rowIdx, rowIdx - 1);
  }

  moveRowDown(rowIdx: number) {
    const rows = this.getVisibleExpenseRows();
    if (rowIdx >= rows.length - 1) return;
    this.swapRows(rowIdx, rowIdx + 1);
  }

  private swapRows(idxA: number, idxB: number) {
    const rows = this.getVisibleExpenseRows();
    const itemA = rows[idxA];
    const itemB = rows[idxB];
    if (!itemA || !itemB) return;

    for (const m of this.currentYearMonths) {
      const posA = m.expenses.findIndex(e => (itemA.id && e.id === itemA.id) || e.description.toLowerCase() === itemA.description.toLowerCase());
      const posB = m.expenses.findIndex(e => (itemB.id && e.id === itemB.id) || e.description.toLowerCase() === itemB.description.toLowerCase());
      if (posA !== -1 && posB !== -1) {
        const temp = m.expenses[posA];
        m.expenses[posA] = m.expenses[posB];
        m.expenses[posB] = temp;
      }
    }
    this.triggerAutoSave();
  }

  // Apply row value to all 12 months & save as default in Catalog
  applyRowValueToAllMonths(item: { id: string; description: string; category: string; owner: ExpenseOwner }, fromMonth: MonthSpreadsheetData) {
    const val = this.getMonthlyExpenseValue(fromMonth, item) ?? 0;
    for (const m of this.currentYearMonths) {
      this.setMonthlyExpenseValue(m, item, val);
    }
    this.saveRowToCatalog(item, fromMonth);
    this.triggerAutoSave();
  }

  getCatalogItemByDesc(desc: string): CatalogExpense | undefined {
    if (!desc || !desc.trim()) return undefined;
    return this.catalogExpenses.find(c => c.description.toLowerCase() === desc.trim().toLowerCase());
  }

  onNewRowDescChange(desc: string) {
    const match = this.getCatalogItemByDesc(desc);
    if (match) {
      this.newRowOwner = match.owner;
    }
  }

  // Database Persistence with atomic baseInitialReserve & baseInitialCapitalGiro
  loadFromDatabase(year: number) {
    const tId = this.state.tenantId();
    this.api.getSpreadsheet(tId, year).subscribe({
      next: (res) => {
        if (res && res.found) {
          if (res.members && Array.isArray(res.members) && res.members.length > 0) {
            this.members = [...res.members];
          }

          this.yearsData = {
            ...this.yearsData,
            [year]: this.normalizeMonthData(res.data)
          };

          this.saveToLocalCache();
          this.saveStatus = 'saved';
          this.lastSavedTime = new Date();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('[Spreadsheet] Failed to fetch from database, keeping cache:', err);
      }
    });
  }

  forceReloadFromDatabase() {
    this.saveStatus = 'saving';
    try {
      localStorage.removeItem('pf_spreadsheet_' + this.selectedYear);
      localStorage.removeItem('pf_household_members');
      localStorage.removeItem('pf_catalog_expenses');
    } catch { }
    this.loadFromDatabase(this.selectedYear);
    this.loadCatalog();
  }

  manualSave() {
    this.triggerImmediateSave();
  }

  triggerAutoSave() {
    this.saveStatus = 'saving';
    this.saveToLocalCache();

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.triggerImmediateSave();
    }, 450);
  }

  getTotalBaseInitialReserve(): number {
    return this.members.reduce((sum, mem) => sum + (Number(mem.baseInitialReserve) || 0), 0);
  }

  private triggerImmediateSave() {
    const year = this.selectedYear;
    const payload = {
      months: this.yearsData[year] || this.currentYearMonths,
      members: this.members,
      baseInitialReserve: this.getTotalBaseInitialReserve()
    };

    this.api.saveSpreadsheet(this.state.tenantId(), year, payload).subscribe({
      next: () => {
        this.saveStatus = 'saved';
        this.lastSavedTime = new Date();
        this.saveToLocalCache();
      },
      error: () => {
        this.saveStatus = 'idle';
      }
    });
  }

  private saveToLocalCache() {
    try {
      localStorage.setItem('pf_spreadsheet_' + this.selectedYear, JSON.stringify(this.yearsData[this.selectedYear]));
      localStorage.setItem('pf_household_members', JSON.stringify(this.members));
      localStorage.setItem('pf_active_profile', this.activeProfile);
      localStorage.setItem('pf_time_horizon', this.timeHorizon);
      localStorage.setItem('pf_catalog_expenses', JSON.stringify(this.catalogExpenses));
    } catch {
      // Local storage full or unavailable
    }
  }

  private loadFromLocalCache() {
    try {
      const savedMembers = localStorage.getItem('pf_household_members');
      if (savedMembers) {
        const parsedM = JSON.parse(savedMembers);
        if (Array.isArray(parsedM) && parsedM.length > 0) {
          this.members = parsedM;
        }
      }
      const savedProfile = localStorage.getItem('pf_active_profile') as ProfileView;
      if (savedProfile) {
        this.activeProfile = savedProfile;
      }
      const savedHorizon = localStorage.getItem('pf_time_horizon') as TimeHorizon;
      if (savedHorizon && ['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].includes(savedHorizon)) {
        this.timeHorizon = savedHorizon;
      }
      const savedCatalog = localStorage.getItem('pf_catalog_expenses');
      if (savedCatalog) {
        this.catalogExpenses = JSON.parse(savedCatalog);
      }
      const savedYear = localStorage.getItem('pf_spreadsheet_' + this.selectedYear);
      if (savedYear) {
        const parsed = JSON.parse(savedYear);
        if (Array.isArray(parsed) && parsed.length === 12) {
          this.yearsData[this.selectedYear] = this.normalizeMonthData(parsed);
        }
      }
    } catch {
      // Ignore cache parse errors
    }
  }

  private normalizeMonthData(input: any): MonthSpreadsheetData[] {
    let months: MonthSpreadsheetData[] = [];
    if (Array.isArray(input)) {
      months = input;
    } else if (input && Array.isArray(input.months)) {
      months = input.months;
    } else if (input && typeof input === 'object') {
      if (Array.isArray(input.data)) {
        months = input.data;
      } else if (input.data && Array.isArray(input.data.months)) {
        months = input.data.months;
      }
    }

    if (!months || months.length === 0) {
      return this.buildEmptyYear(this.selectedYear);
    }

    if (months.length < 12) {
      const template = this.buildEmptyYear(this.selectedYear);
      for (let i = months.length; i < 12; i++) {
        months.push(template[i]);
      }
    }

    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      if (!m.monthName) m.monthName = MONTH_NAMES[i] || `Mês ${i + 1}`;
      if (m.monthIndex === undefined) m.monthIndex = i;
      if (!m.expenses) m.expenses = [];
      if (!m.userIncomes) m.userIncomes = {};
      if (!m.userCapitalGiro) m.userCapitalGiro = {};
      if (!m.userInitialCash) m.userInitialCash = {};

      for (const mem of this.members) {
        if (m.userIncomes[mem.id] === undefined && m.userIncomes[mem.name] !== undefined) {
          m.userIncomes[mem.id] = m.userIncomes[mem.name];
        } else if (m.userIncomes[mem.id] === undefined) {
          m.userIncomes[mem.id] = 0;
        }

        if (m.userCapitalGiro[mem.id] === undefined && m.userCapitalGiro[mem.name] !== undefined) {
          m.userCapitalGiro[mem.id] = m.userCapitalGiro[mem.name];
        } else if (m.userCapitalGiro[mem.id] === undefined) {
          m.userCapitalGiro[mem.id] = mem.baseInitialCapitalGiro || 0;
        }

        if (m.userInitialCash[mem.id] === undefined && m.userInitialCash[mem.name] !== undefined) {
          m.userInitialCash[mem.id] = m.userInitialCash[mem.name];
        } else if (m.userInitialCash[mem.id] === undefined) {
          m.userInitialCash[mem.id] = mem.baseInitialReserve || 0;
        }
      }

      const anyM = m as any;
      for (const key of Object.keys(anyM)) {
        if (key.startsWith('income') && key !== 'income' && anyM[key] !== undefined) {
          const suffix = key.replace('income', '').toLowerCase();
          if (m.userIncomes[suffix] === undefined) {
            m.userIncomes[suffix] = Number(anyM[key]) || 0;
          }
        }
        if (key.startsWith('capitalGiro') && key !== 'capitalGiro' && anyM[key] !== undefined) {
          const suffix = key.replace('capitalGiro', '').toLowerCase();
          if (m.userCapitalGiro[suffix] === undefined) {
            m.userCapitalGiro[suffix] = Number(anyM[key]) || 0;
          }
        }
        if (key.startsWith('initialCash') && key !== 'initialCash' && anyM[key] !== undefined) {
          const suffix = key.replace('initialCash', '').toLowerCase();
          if (m.userInitialCash[suffix] === undefined) {
            m.userInitialCash[suffix] = Number(anyM[key]) || 0;
          }
        }
      }
    }
    return months;
  }

  // Inline description editing handler
  onExpenseDescriptionChange(item: { id: string; description: string }, newDesc: string) {
    const oldDesc = item.description;
    item.description = newDesc;

    for (const y in this.yearsData) {
      for (const m of this.yearsData[y]) {
        const exp = m.expenses.find(e => (item.id && e.id === item.id) || e.description.toLowerCase() === oldDesc.toLowerCase());
        if (exp) {
          exp.description = newDesc;
        }
      }
    }

    this.triggerAutoSave();
  }

  // Dynamic Income Handlers
  getIncomeForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    if (month.userIncomes && month.userIncomes[member.id] !== undefined) {
      return this.round2(Number(month.userIncomes[member.id]));
    }
    if (month.userIncomes && month.userIncomes[member.name] !== undefined) {
      return this.round2(Number(month.userIncomes[member.name]));
    }
    return 0;
  }

  onIncomeChange(month: MonthSpreadsheetData, member: HouseholdMember, val: number) {
    const num = Number(val) || 0;
    if (!month.userIncomes) {
      month.userIncomes = {};
    }
    month.userIncomes[member.id] = num;
    month.income = this.round2(this.members.reduce((sum, mem) => sum + this.getIncomeForMember(month, mem), 0));
    this.triggerAutoSave();
  }

  // Profile & Row Filtering
  matchesProfile(owner: ExpenseOwner): boolean {
    if (this.activeProfile === 'CONSOLIDADO') return true;
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    if (mem) {
      return owner === mem.name || owner === mem.id;
    }
    return true;
  }

  getVisibleExpenseRows(): { id: string; description: string; category: string; owner: ExpenseOwner }[] {
    const map = new Map<string, { id: string; description: string; category: string; owner: ExpenseOwner }>();
    const monthsToScan = this.timeHorizon === 'ANUAL' ? this.currentYearMonths : this.displayedMonths;
    for (const m of monthsToScan) {
      for (const e of m.expenses) {
        if (this.matchesProfile(e.owner)) {
          const key = e.id || e.description.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { id: e.id, description: e.description, category: e.category, owner: e.owner });
          }
        }
      }
    }
    return Array.from(map.values());
  }

  getFilteredExpenses(month: MonthSpreadsheetData): SpreadsheetExpenseItem[] {
    return month.expenses.filter(e => this.matchesProfile(e.owner));
  }

  round2(val: number): number {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  }

  getExpensesForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    return this.round2(
      month.expenses
        .filter(e => e.owner === member.name || e.owner === member.id)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    );
  }

  getExpensesCompartilhado(month: MonthSpreadsheetData): number {
    return this.round2(month.expenses.filter(e => e.owner === 'Compartilhado').reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
  }

  getProfileTotalExpenses(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(month.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getExpensesForMember(month, mem) : this.round2(month.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
  }

  getProfileIncome(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.members.reduce((sum, mem) => sum + this.getIncomeForMember(month, mem), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getIncomeForMember(month, mem) : this.round2(month.income || 0);
  }

  getResultadoForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    return this.round2(this.getIncomeForMember(month, member) - this.getExpensesForMember(month, member));
  }

  getProfileResultado(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.getProfileIncome(month) - this.getProfileTotalExpenses(month));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getResultadoForMember(month, mem) : this.round2(this.getProfileIncome(month) - this.getProfileTotalExpenses(month));
  }

  // =========================================================================
  // CAIXA FINAL (RESERVA DE EMERGÊNCIA - FLUXO AUTOMÁTICO E DINÂMICO POR MEMBRO)
  // =========================================================================
  getInitialReserveForMember(year: number, monthIndex: number, member: HouseholdMember): number {
    const yearMonths = this.yearsData[year];
    const baseReserve = Number(member.baseInitialReserve) || 0;
    if (!yearMonths || !yearMonths[monthIndex]) return this.round2(baseReserve);

    if (monthIndex === 0) {
      const m = yearMonths[0];
      if (m && m.isInitialCashManual && m.userInitialCash && m.userInitialCash[member.id] !== undefined) {
        return this.round2(Number(m.userInitialCash[member.id]));
      }
      return this.round2(baseReserve);
    }
    return this.getFinalCashForMember(year, monthIndex - 1, member);
  }

  getFinalCashForMember(year: number, monthIndex: number, member: HouseholdMember): number {
    const yearMonths = this.yearsData[year];
    if (!yearMonths || !yearMonths[monthIndex]) return 0;

    const m = yearMonths[monthIndex];
    const initialReserve = this.getInitialReserveForMember(year, monthIndex, member);
    const surplusTransfer = this.getSurplusTransferToReserveForMember(m, member);
    const deficitCovered = this.getDeficitCoveredByReserveForMember(m, member);

    return this.round2(initialReserve + surplusTransfer - deficitCovered);
  }

  onFinalCashForMemberChange(year: number, monthIndex: number, member: HouseholdMember, val: number) {
    const yearMonths = this.yearsData[year];
    if (!yearMonths) return;

    const targetVal = this.round2(Number(val) || 0);

    if (monthIndex === 0) {
      member.baseInitialReserve = targetVal;
      const jan = yearMonths[0];
      if (jan) {
        if (!jan.userInitialCash) jan.userInitialCash = {};
        jan.userInitialCash[member.id] = targetVal;
        jan.isInitialCashManual = true;
        jan.initialCash = this.round2(this.members.reduce((sum, mem) => sum + (jan.userInitialCash?.[mem.id] ?? mem.baseInitialReserve), 0));
      }
    } else {
      const currentFinal = this.getFinalCashForMember(year, monthIndex, member);
      const diff = this.round2(targetVal - currentFinal);
      member.baseInitialReserve = this.round2(member.baseInitialReserve + diff);
      const jan = yearMonths[0];
      if (jan) {
        if (!jan.userInitialCash) jan.userInitialCash = {};
        jan.userInitialCash[member.id] = member.baseInitialReserve;
        jan.isInitialCashManual = true;
        jan.initialCash = this.round2(this.members.reduce((sum, mem) => sum + (jan.userInitialCash?.[mem.id] ?? mem.baseInitialReserve), 0));
      }
    }

    this.triggerAutoSave();
  }

  getInitialReserveUnified(year: number, monthIndex: number): number {
    return this.round2(this.members.reduce((sum, mem) => sum + this.getInitialReserveForMember(year, monthIndex, mem), 0));
  }

  getFinalCashUnified(year: number, monthIndex: number): number {
    return this.round2(this.members.reduce((sum, mem) => sum + this.getFinalCashForMember(year, monthIndex, mem), 0));
  }

  getProfileFinalCash(year: number, monthIndex: number): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.getFinalCashUnified(year, monthIndex);
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getFinalCashForMember(year, monthIndex, mem) : this.getFinalCashUnified(year, monthIndex);
  }

  getMonthlyExpenseValue(month: MonthSpreadsheetData, item: { id: string; description: string }): number | null {
    const exp = month.expenses.find(e => (item.id && e.id === item.id) || e.description.toLowerCase() === item.description.toLowerCase());
    return exp ? exp.amount : null;
  }

  setMonthlyExpenseValue(month: MonthSpreadsheetData, item: { id: string; description: string; category?: string; owner?: ExpenseOwner }, value: any) {
    let exp = month.expenses.find(e => (item.id && e.id === item.id) || e.description.toLowerCase() === item.description.toLowerCase());
    if (value === null || value === undefined || value === '') {
      if (exp) {
        month.expenses = month.expenses.filter(e => e !== exp);
      }
    } else {
      const val = Number(value);
      if (isNaN(val)) {
        if (exp) {
          month.expenses = month.expenses.filter(e => e !== exp);
        }
      } else if (exp) {
        exp.amount = val;
        exp.description = item.description;
      } else {
        const activeMember = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
        month.expenses.push({
          id: item.id || ('exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)),
          description: item.description,
          category: item.category || 'GERAL',
          owner: item.owner || (activeMember ? activeMember.name : 'Compartilhado'),
          amount: val
        });
      }
    }
    this.triggerAutoSave();
  }

  cycleOwner(item: { id: string; description: string; owner: ExpenseOwner }) {
    const options = [...this.members.map(m => m.name), 'Compartilhado'];
    const currentIdx = options.findIndex(o => o.toLowerCase() === (item.owner || '').toLowerCase());
    const nextOwner = options[(currentIdx + 1) % options.length];
    item.owner = nextOwner;

    for (const y in this.yearsData) {
      for (const m of this.yearsData[y]) {
        const exp = m.expenses.find(e => (item.id && e.id === item.id) || e.description.toLowerCase() === item.description.toLowerCase());
        if (exp) {
          exp.owner = nextOwner;
        }
      }
    }
    this.triggerAutoSave();
  }

  addNewExpenseRow() {
    const desc = this.newRowDesc.trim();
    if (!desc) return;

    const match = this.getCatalogItemByDesc(desc);
    const newId = 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const activeMember = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    const fallbackOwner = activeMember ? activeMember.name : 'Compartilhado';
    const owner = this.newRowOwner || (match ? match.owner : fallbackOwner);
    const defaultVal = match ? match.defaultAmount : 0;
    const category = match ? match.category : 'GERAL';
    const currentMonthIdx = this.primaryDisplayedMonth.monthIndex;

    let targetMonths: MonthSpreadsheetData[] = [];
    if (this.newRowReplicationMode === 'CURRENT_ONLY') {
      targetMonths = [this.primaryDisplayedMonth];
    } else if (this.newRowReplicationMode === 'REPLICATE_FORWARD') {
      targetMonths = this.currentYearMonths.filter(m => m.monthIndex >= currentMonthIdx);
    } else {
      targetMonths = this.currentYearMonths;
    }

    for (const m of targetMonths) {
      const existing = m.expenses.find(e => (newId && e.id === newId) || e.description.toLowerCase() === desc.toLowerCase());
      if (existing) {
        existing.amount = defaultVal;
        existing.owner = owner;
        existing.category = category;
      } else {
        m.expenses.push({
          id: newId,
          description: desc,
          category: category,
          owner: owner,
          amount: defaultVal
        });
      }
    }

    this.newRowDesc = '';
    this.newRowReplicationMode = 'CURRENT_ONLY';
    this.newRowOwner = activeMember ? activeMember.name : 'Compartilhado';
    this.triggerAutoSave();
  }

  removeExpenseRow(item: { id: string; description: string }) {
    const targetMonths = this.timeHorizon === 'ANUAL' ? this.currentYearMonths : this.displayedMonths;
    for (const m of targetMonths) {
      m.expenses = m.expenses.filter(e => (item.id && e.id !== item.id) || (!item.id && e.description.toLowerCase() !== item.description.toLowerCase()));
    }
    this.triggerAutoSave();
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'CARTAO': return 'bg-purple-400';
      case 'MORADIA': return 'bg-blue-400';
      case 'CONTAS': return 'bg-amber-400';
      case 'TAXAS': return 'bg-rose-400';
      case 'REFORMA': return 'bg-orange-400';
      default: return 'bg-emerald-400';
    }
  }

  syncActiveMonthToLedger() {
    const m = this.primaryDisplayedMonth;
    this.syncing = true;
    this.lastSyncMessage = null;

    const accId = this.state.accounts()[0]?.accountId || 'acc-checking-01';

    // Record salary transactions for all members with income > 0
    for (const mem of this.members) {
      const inc = this.getIncomeForMember(m, mem);
      if (inc > 0) {
        this.api.recordTransaction(this.state.tenantId(), {
          accountId: accId,
          amount: inc,
          type: 'INCOME',
          category: 'SALARY',
          merchant: 'Salário ' + mem.name,
          description: 'Salário ' + mem.name + ' - ' + m.monthName + '/' + this.selectedYear
        }).subscribe();
      }
    }

    let dispatched = 0;
    for (const exp of m.expenses) {
      if (exp.amount > 0) {
        dispatched++;
        this.api.recordTransaction(this.state.tenantId(), {
          accountId: accId,
          amount: exp.amount,
          type: 'EXPENSE',
          category: exp.category,
          merchant: exp.description,
          description: 'Gasto ' + exp.owner + ': ' + exp.description + ' (' + m.monthName + '/' + this.selectedYear + ')'
        }).subscribe();
      }
    }

    setTimeout(() => {
      this.syncing = false;
      this.lastSyncMessage = 'Sincronizados ' + dispatched + ' lançamentos de ' + m.monthName + ' no Event Store!';
      this.state.refreshAll();
    }, 600);
  }

  toggleAiDrawer() {
    this.showAiDrawer = !this.showAiDrawer;
    if (this.showAiDrawer && this.aiMessages.length === 0) {
      this.aiMessages.push({
        id: 'welcome',
        sender: 'agent',
        content: 'Olá! Sou seu Assistente Financeiro IA. Estou sincronizado com o Catálogo de Despesas no PostgreSQL e aplicando a regra: déficits são debitados do Capital de Giro primeiro, preservando as Reservas de Emergência individuais e familiares.',
        timestamp: new Date()
      });
    }
  }

  askAi(query: string) {
    this.aiQuery = query;
    this.sendAiQuery();
  }

  sendAiQuery() {
    const text = this.aiQuery.trim();
    if (!text || this.aiThinking) return;

    this.aiMessages.push({
      id: 'u-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: new Date()
    });

    this.aiQuery = '';
    this.aiThinking = true;

    this.api.chatWithAdvisor(this.state.tenantId(), text).subscribe({
      next: (res) => {
        this.aiThinking = false;
        this.aiMessages.push({
          id: 'a-' + Date.now(),
          sender: 'agent',
          content: res.reply,
          toolTraces: res.toolTraces,
          citations: res.citations,
          responseTimeMs: res.responseTimeMs,
          timestamp: new Date()
        });
      },
      error: () => {
        this.aiThinking = false;
        const fallback = this.generateLocalAiInsights(text);
        this.aiMessages.push({
          id: 'a-' + Date.now(),
          sender: 'agent',
          content: fallback,
          timestamp: new Date()
        });
      }
    });
  }

  private generateLocalAiInsights(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('catálogo') || q.includes('catalogo') || q.includes('padrão') || q.includes('padrao')) {
      const itemsList = this.catalogExpenses.map(c => `• **${c.icon || '💳'} ${c.description}** (${c.owner}): R$ ${c.defaultAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n');
      return `📑 **Catálogo de Despesas Cadastradas (${this.catalogExpenses.length} itens no PostgreSQL):**\n\n${itemsList}\n\n💡 Você pode editar a descrição e o valor padrão de qualquer despesa a qualquer momento no botão **Catálogo de Despesas**!`;
    }
    if (q.includes('reserva') || q.includes('caixa final') || q.includes('separad')) {
      const membersResList = this.members.map(m => `- ${m.icon} **${m.name}:** R$ ${this.getFinalCashForMember(this.selectedYear, this.primaryDisplayedMonth.monthIndex, m).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join('\n');
      const uRes = this.getFinalCashUnified(this.selectedYear, this.primaryDisplayedMonth.monthIndex);
      return `🛡️ **Reservas de Emergência em ${this.primaryDisplayedMonth.monthName}/${this.selectedYear}:**\n\n${membersResList}\n- 👑 **Reserva Familiar Unificada:** **R$ ${uRes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n\n💡 **Proteção Ativa:** Qualquer déficit no mês é descontado do Capital de Giro primeiro, garantindo a preservação total da sua reserva persistida no PostgreSQL!`;
    }
    if (q.includes('giro') || q.includes('capital') || q.includes('déficit') || q.includes('deficit')) {
      const capFinal = this.getProfileFinalCapitalGiro(this.primaryDisplayedMonth);
      const res = this.getProfileResultado(this.primaryDisplayedMonth);
      return `🏦 **Capital de Giro Residual:**\n\n- **Resultado do Mês:** ${res >= 0 ? '+' : ''}R$ ${res.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- **Giro Residual:** **R$ ${capFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**\n\n${res < 0 ? '✓ O déficit foi absorvido pelo Capital de Giro, poupando a sua Reserva de Emergência!' : '✓ Mês em superávit! A reserva foi acrescida.'}`;
    }
    return `Análise do mês **${this.primaryDisplayedMonth.monthName}/${this.selectedYear}**:\n- **Perfil:** ${this.getActiveProfileLabel()}\n- **Capital de Giro Residual:** R$ ${this.getProfileFinalCapitalGiro(this.primaryDisplayedMonth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- **Gastos:** R$ ${this.getProfileTotalExpenses(this.primaryDisplayedMonth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- **Rendimentos:** R$ ${this.getProfileIncome(this.primaryDisplayedMonth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- **Resultado:** R$ ${this.getProfileResultado(this.primaryDisplayedMonth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- **Caixa Final:** R$ ${this.getProfileFinalCash(this.selectedYear, this.primaryDisplayedMonth.monthIndex).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  private buildEmptyYear(year: number): MonthSpreadsheetData[] {
    const list: MonthSpreadsheetData[] = [];
    for (let i = 0; i < 12; i++) {
      const uIncomes: Record<string, number> = {};
      const uGiro: Record<string, number> = {};
      const uInitCash: Record<string, number> = {};
      for (const mem of this.members) {
        uIncomes[mem.id] = 0;
        uGiro[mem.id] = mem.baseInitialCapitalGiro || 0;
        uInitCash[mem.id] = mem.baseInitialReserve || 0;
      }
      list.push({
        id: 'm-' + i + '-' + year,
        monthIndex: i,
        monthName: MONTH_NAMES[i],
        year: year,
        yearMonth: year + '-' + String(i + 1).padStart(2, '0'),
        income: 0,
        userIncomes: uIncomes,
        userCapitalGiro: uGiro,
        userInitialCash: uInitCash,
        capitalGiro: 0,
        initialCash: 0,
        expenses: []
      });
    }
    return list;
  }
}
