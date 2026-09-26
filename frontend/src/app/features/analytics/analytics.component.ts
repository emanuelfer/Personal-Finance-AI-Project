import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceApiService } from '../../core/services/finance-api.service';
import { StateService } from '../../core/services/state.service';
import { MonthSpreadsheetData, ProfileView, ExpenseOwner, HouseholdMember } from '../../core/models/finance.models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">

      <!-- Header Ribbon with Year & Profile Switcher -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800">
        
        <!-- Title & Subtitle -->
        <div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20">
              📈
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Evolução & Gráficos Financeiros</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold"
                      [ngClass]="activeProfile === 'CONSOLIDADO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'">
                  {{ getActiveProfileLabel() }}
                </span>
              </h1>
              <p class="text-xs text-slate-400">
                Análise gráfica completa de Capital de Giro, Rendimentos, Gastos, Resultado e Reserva de Emergência
              </p>
            </div>
          </div>
        </div>

        <!-- Controls: Year Switcher, Profile Switcher & Back to Spreadsheet -->
        <div class="flex items-center gap-2.5 flex-wrap">
          
          <!-- Year Selector -->
          <div class="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 font-mono text-xs shadow-inner">
            <button (click)="changeYear(selectedYear - 1)" title="Ano Anterior" class="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition">
              ◀
            </button>
            <span class="px-2.5 py-1 font-bold text-emerald-400 text-sm">
              {{ selectedYear }}
            </span>
            <button (click)="changeYear(selectedYear + 1)" title="Próximo Ano" class="px-2 py-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition">
              ▶
            </button>
          </div>

          <!-- Profile Switcher Tabs (Dynamic Members) -->
          <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1">
            @for (mem of members; track mem.id) {
              <button (click)="setProfile(mem.id)"
                      class="px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      [ngClass]="activeProfile === mem.id ? getProfileButtonActiveClass(mem) : 'text-slate-400 hover:text-slate-200'">
                <span>{{ mem.icon }}</span>
                <span>{{ mem.name }}</span>
              </button>
            }
            <button (click)="setProfile('CONSOLIDADO')"
                    class="px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    [ngClass]="activeProfile === 'CONSOLIDADO' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold' : 'text-slate-400 hover:text-slate-200'">
              <span>👥</span>
              <span>Consolidado</span>
            </button>
          </div>

          <!-- Quick link to spreadsheet -->
          <a routerLink="/spreadsheet"
             class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <span>📊 Planilha Mensal</span>
            <span>→</span>
          </a>

        </div>

      </div>

      <!-- Annual KPI Summary Ribbon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        <!-- Capital de Giro Médio -->
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden border border-slate-800 group hover:border-amber-500/40 transition">
          <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Capital de Giro Médio</span>
            <span class="text-xs">🟡</span>
          </div>
          <div class="text-2xl font-extrabold text-amber-300 mt-1.5 font-mono">
            R$ {{ averageMonthlyGiro | number:'1.2-2' }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Média mensal residual disponível
          </div>
        </div>

        <!-- Rendimentos Anuais -->
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden border border-slate-800 group hover:border-emerald-500/40 transition">
          <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Rendimentos Anuais</span>
            <span class="text-xs">🟢</span>
          </div>
          <div class="text-2xl font-extrabold text-emerald-400 mt-1.5 font-mono">
            R$ {{ totalAnnualIncome | number:'1.2-2' }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Total acumulado em 12 meses
          </div>
        </div>

        <!-- Total de Gastos Anuais -->
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden border border-slate-800 group hover:border-rose-500/40 transition">
          <div class="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Gastos Anuais</span>
            <span class="text-xs">🔴</span>
          </div>
          <div class="text-2xl font-extrabold text-rose-400 mt-1.5 font-mono">
            R$ {{ totalAnnualExpenses | number:'1.2-2' }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Total despesas registradas no ano
          </div>
        </div>

        <!-- Resultado Anual Líquido -->
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden border border-slate-800 group hover:border-cyan-500/40 transition">
          <div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
            <span>Resultado do Ano</span>
            <span class="text-xs">🔵</span>
          </div>
          <div class="text-2xl font-extrabold mt-1.5 font-mono" [ngClass]="annualNetResult >= 0 ? 'text-cyan-300' : 'text-rose-400'">
            {{ annualNetResult >= 0 ? '+' : '' }}R$ {{ annualNetResult | number:'1.2-2' }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Superávit líquido acumulado
          </div>
        </div>

        <!-- Caixa Final em Dezembro (Reserva) -->
        <div class="glass-panel p-4 rounded-2xl relative overflow-hidden border border-slate-800 group hover:border-purple-500/40 transition">
          <div class="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
            <span>Caixa Final (Dez)</span>
            <span class="text-xs">🟣</span>
          </div>
          <div class="text-2xl font-extrabold text-purple-300 mt-1.5 font-mono">
            R$ {{ yearEndReserve | number:'1.2-2' }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">
            Reserva de Emergência projetada
          </div>
        </div>

      </div>

      <!-- Chart View Controls & Interactive Graph Panel -->
      <div class="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        
        <!-- Header with Chart Presets & Legends -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <span>Evolução Mensal • {{ selectedYear }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">12 Meses (Jan - Dez)</span>
            </h2>
            <p class="text-xs text-slate-400">
              Visualize o fluxo financeiro mês a mês e a propagação dinâmica da reserva de emergência
            </p>
          </div>

          <!-- Chart Preset Filter Tabs -->
          <div class="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold flex-wrap">
            <button (click)="setChartMode('ALL')"
                    class="px-3 py-1.5 rounded-lg transition"
                    [ngClass]="activeChartMode === 'ALL' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-400 hover:text-slate-200'">
              📊 Todos os 5 Indicadores
            </button>
            <button (click)="setChartMode('FLOW')"
                    class="px-3 py-1.5 rounded-lg transition"
                    [ngClass]="activeChartMode === 'FLOW' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-400 hover:text-slate-200'">
              💸 Rendimentos x Gastos x Resultado
            </button>
            <button (click)="setChartMode('RESERVES')"
                    class="px-3 py-1.5 rounded-lg transition"
                    [ngClass]="activeChartMode === 'RESERVES' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-400 hover:text-slate-200'">
              🛡️ Capital de Giro & Reserva
            </button>
            <button (click)="setChartMode('BARS')"
                    class="px-3 py-1.5 rounded-lg transition"
                    [ngClass]="activeChartMode === 'BARS' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-400 hover:text-slate-200'">
              📈 Barras Comparativas
            </button>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="relative w-full h-[400px] sm:h-[460px] pt-2">
          <canvas #analyticsCanvas></canvas>
        </div>

        <!-- Custom Legend Indicators -->
        <div class="flex items-center justify-center gap-4 sm:gap-6 flex-wrap pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div class="flex items-center gap-1.5 text-amber-400">
            <span class="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-sm"></span>
            <span>Capital de Giro</span>
          </div>
          <div class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow-sm"></span>
            <span>Rendimentos</span>
          </div>
          <div class="flex items-center gap-1.5 text-rose-400">
            <span class="w-3 h-3 rounded-full bg-rose-400 inline-block shadow-sm"></span>
            <span>Total de Gastos</span>
          </div>
          <div class="flex items-center gap-1.5 text-cyan-400">
            <span class="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm"></span>
            <span>Resultado do Mês</span>
          </div>
          <div class="flex items-center gap-1.5 text-purple-400">
            <span class="w-3 h-3 rounded-full bg-purple-400 inline-block shadow-sm"></span>
            <span>Caixa Final (Reserva)</span>
          </div>
        </div>

      </div>

      <!-- Detailed 12-Month Numerical Breakdown Table -->
      <div class="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Tabela de Valores Mensais • {{ selectedYear }}</h3>
            <p class="text-xs text-slate-400">Detalhamento numérico mês a mês sincronizado com a base de dados</p>
          </div>
          <span class="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            {{ activeProfile }}
          </span>
        </div>

        <div class="overflow-x-auto border border-slate-800/80 rounded-xl">
          <table class="w-full text-left text-xs border-collapse font-sans">
            <thead class="bg-slate-900/95 text-slate-300 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th class="p-3 border-r border-slate-800 min-w-[120px]">Mês</th>
                <th class="p-3 border-r border-slate-800 text-right text-emerald-400">Rendimentos</th>
                <th class="p-3 border-r border-slate-800 text-right text-rose-400">Total de Gastos</th>
                <th class="p-3 border-r border-slate-800 text-right text-cyan-400">Resultado Líquido</th>
                <th class="p-3 border-r border-slate-800 text-right text-amber-400">Capital de Giro</th>
                <th class="p-3 text-right text-purple-400">Caixa Final (Reserva)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              @for (m of currentYearMonths; track m.id; let idx = $index) {
                <tr class="hover:bg-slate-900/40 transition">
                  <td class="p-3 border-r border-slate-800 font-bold text-slate-200">
                    {{ m.monthName }} / {{ selectedYear }}
                  </td>
                  <td class="p-3 border-r border-slate-800 text-right text-emerald-400 font-semibold">
                    R$ {{ getProfileIncome(m) | number:'1.2-2' }}
                  </td>
                  <td class="p-3 border-r border-slate-800 text-right text-rose-400 font-semibold">
                    R$ {{ getProfileTotalExpenses(m) | number:'1.2-2' }}
                  </td>
                  <td class="p-3 border-r border-slate-800 text-right font-bold"
                      [ngClass]="getProfileResultado(m) >= 0 ? 'text-cyan-300' : 'text-rose-400'">
                    {{ getProfileResultado(m) >= 0 ? '+' : '' }}R$ {{ getProfileResultado(m) | number:'1.2-2' }}
                  </td>
                  <td class="p-3 border-r border-slate-800 text-right text-amber-300 font-bold">
                    R$ {{ getProfileFinalCapitalGiro(m) | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right text-purple-300 font-black">
                    R$ {{ getProfileFinalCash(selectedYear, idx) | number:'1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="bg-slate-900/80 font-mono text-xs font-bold border-t-2 border-slate-700">
              <tr>
                <td class="p-3 border-r border-slate-800 text-slate-200">TOTAL / FINAL</td>
                <td class="p-3 border-r border-slate-800 text-right text-emerald-400">
                  R$ {{ totalAnnualIncome | number:'1.2-2' }}
                </td>
                <td class="p-3 border-r border-slate-800 text-right text-rose-400">
                  R$ {{ totalAnnualExpenses | number:'1.2-2' }}
                </td>
                <td class="p-3 border-r border-slate-800 text-right" [ngClass]="annualNetResult >= 0 ? 'text-cyan-300' : 'text-rose-400'">
                  {{ annualNetResult >= 0 ? '+' : '' }}R$ {{ annualNetResult | number:'1.2-2' }}
                </td>
                <td class="p-3 border-r border-slate-800 text-right text-amber-400">
                  Média: R$ {{ averageMonthlyGiro | number:'1.2-2' }}
                </td>
                <td class="p-3 text-right text-purple-400 font-black">
                  R$ {{ yearEndReserve | number:'1.2-2' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  `
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(FinanceApiService);
  state = inject(StateService);

  @ViewChild('analyticsCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  selectedYear = 2026;
  activeProfile: ProfileView = 'CONSOLIDADO';
  activeChartMode: 'ALL' | 'FLOW' | 'RESERVES' | 'BARS' = 'ALL';

  chart: Chart | null = null;

  // Household Members (Dynamic Multi-User)
  members: HouseholdMember[] = [];

  // Multi-Year Data Store
  yearsData: Record<number, MonthSpreadsheetData[]> = {
    2026: this.buildEmptyYear(2026),
    2027: this.buildEmptyYear(2027)
  };

  ngOnInit() {
    this.loadFromLocalCache();
    this.loadFromDatabase(this.selectedYear);
  }

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  get currentYearMonths(): MonthSpreadsheetData[] {
    return this.yearsData[this.selectedYear] || [];
  }

  setProfile(profile: ProfileView) {
    this.activeProfile = profile;
    try {
      localStorage.setItem('pf_active_profile', profile);
    } catch {
      // Ignore localStorage error
    }
    this.updateChart();
  }

  getActiveProfileLabel(): string {
    if (this.activeProfile === 'CONSOLIDADO') return '👥 Visão Consolidada (Família)';
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? `${mem.icon} ${mem.name}` : this.activeProfile;
  }

  getProfileButtonActiveClass(mem: HouseholdMember): string {
    switch (mem.color) {
      case 'indigo': return 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold';
      case 'purple': return 'bg-purple-600 text-white shadow-md shadow-purple-500/20 font-bold';
      case 'emerald': return 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 font-bold';
      case 'amber': return 'bg-amber-600 text-white shadow-md shadow-amber-500/20 font-bold';
      case 'rose': return 'bg-rose-600 text-white shadow-md shadow-rose-500/20 font-bold';
      case 'sky': return 'bg-sky-600 text-white shadow-md shadow-sky-500/20 font-bold';
      case 'cyan': return 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20 font-bold';
      default: return 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold';
    }
  }

  setChartMode(mode: 'ALL' | 'FLOW' | 'RESERVES' | 'BARS') {
    this.activeChartMode = mode;
    this.updateChart();
  }

  changeYear(year: number) {
    if (year < 2020 || year > 2040) return;
    this.selectedYear = year;
    if (!this.yearsData[year]) {
      this.yearsData[year] = this.buildEmptyYear(year);
    }
    this.loadFromDatabase(year);
  }

  // =========================================================================
  // FINANCIAL CALCULATION ENGINE (100% Dynamic & 2-Decimal Precision)
  // =========================================================================
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

  getProfileTotalExpenses(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(month.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getExpensesForMember(month, mem) : this.round2(month.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
  }

  getIncomeForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    if (month.userIncomes && month.userIncomes[member.id] !== undefined) {
      return this.round2(Number(month.userIncomes[member.id]));
    }
    if (month.userIncomes && month.userIncomes[member.name] !== undefined) {
      return this.round2(Number(month.userIncomes[member.name]));
    }
    const lower = member.name.toLowerCase();
    if (month.userIncomes && month.userIncomes[lower] !== undefined) {
      return this.round2(Number(month.userIncomes[lower]));
    }
    return 0;
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

  // Capital de Giro Engine
  getCapCapitalGiroForMember(member: HouseholdMember): number {
    return Number(member.baseInitialCapitalGiro) || 0;
  }

  getInitialCapitalGiroForMember(month: MonthSpreadsheetData, member: HouseholdMember): number {
    if (month.monthIndex === 0) {
      if (month.userCapitalGiro && month.isInitialGiroManual) {
        if (month.userCapitalGiro[member.id] !== undefined) {
          return this.round2(Number(month.userCapitalGiro[member.id]));
        }
        if (month.userCapitalGiro[member.name] !== undefined) {
          return this.round2(Number(month.userCapitalGiro[member.name]));
        }
        const lower = member.name.toLowerCase();
        if (month.userCapitalGiro[lower] !== undefined) {
          return this.round2(Number(month.userCapitalGiro[lower]));
        }
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

  getProfileFinalCapitalGiro(month: MonthSpreadsheetData): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.members.reduce((sum, mem) => sum + this.getFinalCapitalGiroForMember(month, mem), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getFinalCapitalGiroForMember(month, mem) : 0;
  }

  // Caixa Final / Reserva de Emergência Engine
  getInitialReserveForMember(year: number, monthIndex: number, member: HouseholdMember): number {
    const yearMonths = this.yearsData[year];
    const baseReserve = Number(member.baseInitialReserve) || 0;
    if (!yearMonths || !yearMonths[monthIndex]) return this.round2(baseReserve);

    if (monthIndex === 0) {
      const m = yearMonths[0];
      if (m && m.isInitialCashManual && m.userInitialCash) {
        if (m.userInitialCash[member.id] !== undefined) {
          return this.round2(Number(m.userInitialCash[member.id]));
        }
        if (m.userInitialCash[member.name] !== undefined) {
          return this.round2(Number(m.userInitialCash[member.name]));
        }
        const lower = member.name.toLowerCase();
        if (m.userInitialCash[lower] !== undefined) {
          return this.round2(Number(m.userInitialCash[lower]));
        }
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

  getProfileFinalCash(year: number, monthIndex: number): number {
    if (this.activeProfile === 'CONSOLIDADO') {
      return this.round2(this.members.reduce((sum, mem) => sum + this.getFinalCashForMember(year, monthIndex, mem), 0));
    }
    const mem = this.members.find(m => m.id === this.activeProfile || m.name.toUpperCase() === this.activeProfile.toUpperCase());
    return mem ? this.getFinalCashForMember(year, monthIndex, mem) : 0;
  }

  // =========================================================================
  // ANNUAL AGGREGATES & METRICS
  // =========================================================================
  get totalAnnualIncome(): number {
    return this.round2(this.currentYearMonths.reduce((sum, m) => sum + this.getProfileIncome(m), 0));
  }

  get totalAnnualExpenses(): number {
    return this.round2(this.currentYearMonths.reduce((sum, m) => sum + this.getProfileTotalExpenses(m), 0));
  }

  get annualNetResult(): number {
    return this.round2(this.totalAnnualIncome - this.totalAnnualExpenses);
  }

  get averageMonthlyGiro(): number {
    if (this.currentYearMonths.length === 0) return 0;
    const sum = this.currentYearMonths.reduce((acc, m) => acc + this.getProfileFinalCapitalGiro(m), 0);
    return this.round2(sum / this.currentYearMonths.length);
  }

  get yearEndReserve(): number {
    if (this.currentYearMonths.length === 0) return 0;
    return this.getProfileFinalCash(this.selectedYear, this.currentYearMonths.length - 1);
  }

  // =========================================================================
  // CHART.JS RENDERING & REACTIVE UPDATES
  // =========================================================================
  renderChart() {
    if (!this.canvasRef) return;
    if (this.chart) {
      this.chart.destroy();
    }

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const months = this.currentYearMonths;

    const giroData = months.map(m => this.getProfileFinalCapitalGiro(m));
    const incomeData = months.map(m => this.getProfileIncome(m));
    const expenseData = months.map(m => this.getProfileTotalExpenses(m));
    const resultadoData = months.map(m => this.getProfileResultado(m));
    const reserveData = months.map((_, idx) => this.getProfileFinalCash(this.selectedYear, idx));

    let datasets: any[] = [];

    if (this.activeChartMode === 'ALL') {
      datasets = [
        {
          type: 'line',
          label: 'Caixa Final (Reserva)',
          data: reserveData,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#a855f7'
        },
        {
          type: 'line',
          label: 'Capital de Giro',
          data: giroData,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          borderDash: [5, 5],
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b'
        },
        {
          type: 'bar',
          label: 'Rendimentos',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          type: 'bar',
          label: 'Total de Gastos',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.5)',
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          type: 'line',
          label: 'Resultado do Mês',
          data: resultadoData,
          borderColor: '#06b6d4',
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4'
        }
      ];
    } else if (this.activeChartMode === 'FLOW') {
      datasets = [
        {
          type: 'bar',
          label: 'Rendimentos',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'bar',
          label: 'Total de Gastos',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.7)',
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'line',
          label: 'Resultado Líquido',
          data: resultadoData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#06b6d4'
        }
      ];
    } else if (this.activeChartMode === 'RESERVES') {
      datasets = [
        {
          type: 'line',
          label: 'Caixa Final (Reserva Acumulada)',
          data: reserveData,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          borderWidth: 3.5,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#a855f7'
        },
        {
          type: 'line',
          label: 'Capital de Giro Residual',
          data: giroData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#f59e0b'
        }
      ];
    } else {
      // BARS comparative
      datasets = [
        {
          type: 'bar',
          label: 'Rendimentos',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 6
        },
        {
          type: 'bar',
          label: 'Gastos',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.7)',
          borderRadius: 6
        },
        {
          type: 'bar',
          label: 'Giro',
          data: giroData,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderRadius: 6
        },
        {
          type: 'bar',
          label: 'Reserva Final',
          data: reserveData,
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderRadius: 6
        }
      ];
    }

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.parsed.y || 0;
                return ` ${label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'monospace',
                size: 11
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'monospace',
                size: 11
              },
              callback: (value) => {
                const n = Number(value);
                if (Math.abs(n) >= 1000) {
                  return 'R$ ' + (n / 1000).toFixed(1) + 'k';
                }
                return 'R$ ' + n;
              }
            }
          }
        }
      }
    });
  }

  updateChart() {
    if (this.chart) {
      this.renderChart();
    }
  }

  // =========================================================================
  // PERSISTENCE & DATABASE LOADING
  // =========================================================================
  loadFromDatabase(year: number) {
    this.api.getSpreadsheet(this.state.tenantId(), year).subscribe({
      next: (res) => {
        if (res && res.found && res.data) {
          if (res.members && Array.isArray(res.members) && res.members.length > 0) {
            this.members = res.members;
          }
          this.yearsData[year] = this.normalizeMonthData(res.data);
        }
        this.updateChart();
      },
      error: () => {
        this.loadFromLocalCache();
        this.updateChart();
      }
    });
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
      const saved = localStorage.getItem('pf_spreadsheet_' + this.selectedYear);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          this.yearsData[this.selectedYear] = this.normalizeMonthData(parsed);
        }
      }
    } catch {
      // Local cache error
    }
  }

  private normalizeMonthData(months: MonthSpreadsheetData[]): MonthSpreadsheetData[] {
    if (!months || !Array.isArray(months)) return [];
    for (const m of months) {
      if (!m.userIncomes) m.userIncomes = {};
      if (!m.userCapitalGiro) m.userCapitalGiro = {};
      if (!m.userInitialCash) m.userInitialCash = {};
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

  // =========================================================================
  // DATA TEMPLATES (Empty Years)
  // =========================================================================
  private buildEmptyYear(year: number): MonthSpreadsheetData[] {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

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
        id: `${year}-${String(i + 1).padStart(2, '0')}`,
        monthIndex: i,
        monthName: monthNames[i],
        year: year,
        yearMonth: `${year}-${String(i + 1).padStart(2, '0')}`,
        expenses: [],
        income: 0,
        userIncomes: uIncomes,
        userCapitalGiro: uGiro,
        userInitialCash: uInitCash,
        capitalGiro: 0,
        initialCash: 0
      });
    }
    return list;
  }
}
