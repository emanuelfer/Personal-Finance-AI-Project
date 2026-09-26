import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { EventEnvelope } from '../../core/models/finance.models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h1 class="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Immutable Event Stream Ledger</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">Chronological, tamper-proof append-only source of truth in PostgreSQL</p>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <div class="text-xs font-mono tabular-nums text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Total Ledger Events: <span class="text-emerald-400 font-medium">{{ state.totalEventCount() }}</span>
          </div>
          <button (click)="state.refreshAll()" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 border border-emerald-600/30 cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Atualizar Stream</span>
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="bg-[#0c1322] border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center gap-3">
        <input type="text" [(ngModel)]="filterQuery" placeholder="Filtrar por evento, aggregate ID ou payload..."
               class="flex-1 min-w-[280px] bg-[#060913] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-600 font-mono" />
        
        <select [(ngModel)]="selectedAggregateType" class="bg-[#060913] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-600">
          <option value="">Todos os Aggregates</option>
          <option value="SPREADSHEET">SPREADSHEET</option>
          <option value="ACCOUNT">ACCOUNT</option>
          <option value="RECEIPT">RECEIPT</option>
          <option value="BUDGET">BUDGET</option>
        </select>
      </div>

      <!-- Events Stream Timeline -->
      <div class="space-y-3">
        @if (filteredEvents.length === 0) {
          <div class="bg-[#0c1322] border border-slate-800 p-12 rounded-xl text-center text-slate-500 space-y-2">
            <p>Nenhum evento corresponde aos critérios para o tenant <span class="font-mono text-slate-400">{{ state.tenantId() }}</span></p>
          </div>
        } @else {
          @for (evt of filteredEvents; track evt.eventId) {
            <div class="bg-[#0c1322] border border-slate-800 hover:border-slate-700/80 p-4 rounded-xl space-y-3 transition">
              
              <!-- Top Row -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded font-mono text-[11px] font-medium bg-slate-800 text-emerald-400 border border-emerald-500/20">
                    {{ evt.eventType }}
                  </span>

                  <span class="text-xs text-slate-400 font-mono">
                    {{ evt.aggregateType }}: <span class="text-slate-200 font-medium">{{ evt.aggregateId }}</span>
                  </span>

                  <span class="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    v{{ evt.eventVersion }}
                  </span>
                </div>

                <div class="text-xs text-slate-400 font-mono tabular-nums flex items-center gap-2">
                  <span>{{ evt.occurredAt | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                  <span class="text-[10px] text-slate-500 truncate max-w-[120px]" [title]="evt.eventId">{{ evt.eventId }}</span>
                </div>
              </div>

              <!-- Payload & Metadata Details -->
              <div class="bg-[#060913] p-3 rounded-lg border border-slate-800/80 font-mono tabular-nums text-xs overflow-x-auto text-emerald-400/90 leading-relaxed">
                <pre>{{ formatJson(evt.payloadJson) }}</pre>
              </div>

            </div>
          }
        }
      </div>

    </div>
  `
})
export class AuditComponent {
  state = inject(StateService);

  filterQuery = '';
  selectedAggregateType = '';

  get filteredEvents(): EventEnvelope[] {
    let list = this.state.auditEvents();
    if (this.selectedAggregateType) {
      list = list.filter(e => e.aggregateType === this.selectedAggregateType);
    }
    if (this.filterQuery.trim()) {
      const q = this.filterQuery.toLowerCase();
      list = list.filter(e =>
        e.eventType.toLowerCase().includes(q) ||
        e.aggregateId.toLowerCase().includes(q) ||
        e.payloadJson.toLowerCase().includes(q)
      );
    }
    return list;
  }

  formatJson(jsonStr: string): string {
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonStr;
    }
  }
}
