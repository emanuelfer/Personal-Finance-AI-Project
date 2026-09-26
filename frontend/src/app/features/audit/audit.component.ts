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
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <span>Immutable Event Stream Ledger</span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          </h1>
          <p class="text-xs text-slate-400">Chronological, tamper-proof append-only source of truth in PostgreSQL</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Total Ledger Events: <span class="text-emerald-400 font-bold">{{ state.totalEventCount() }}</span>
          </div>
          <button (click)="state.refreshAll()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">
            🔄 Refresh Stream
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3">
        <input type="text" [(ngModel)]="filterQuery" placeholder="Filter by event type, aggregate ID, or payload text..."
               class="flex-1 min-w-[280px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono" />
        
        <select [(ngModel)]="selectedAggregateType" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none">
          <option value="">All Aggregate Types</option>
          <option value="SPREADSHEET">SPREADSHEET</option>
          <option value="ACCOUNT">ACCOUNT</option>
          <option value="RECEIPT">RECEIPT</option>
          <option value="BUDGET">BUDGET</option>
        </select>
      </div>

      <!-- Events Stream Timeline -->
      <div class="space-y-3">
        @if (filteredEvents.length === 0) {
          <div class="glass-panel p-12 rounded-2xl text-center text-slate-500 space-y-2">
            <p>No events match your criteria or event store is empty for tenant <span class="font-mono text-slate-400">{{ state.tenantId() }}</span></p>
          </div>
        } @else {
          @for (evt of filteredEvents; track evt.eventId) {
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition">
              
              <!-- Top Row -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-lg font-mono text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                    {{ evt.eventType }}
                  </span>

                  <span class="text-xs text-slate-400 font-mono">
                    {{ evt.aggregateType }}: <span class="text-slate-200 font-semibold">{{ evt.aggregateId }}</span>
                  </span>

                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    v{{ evt.eventVersion }}
                  </span>
                </div>

                <div class="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span>{{ evt.occurredAt | date:'yyyy-MM-dd HH:mm:ss' }}</span>
                  <span class="text-[10px] text-slate-600 truncate max-w-[120px]" [title]="evt.eventId">{{ evt.eventId }}</span>
                </div>
              </div>

              <!-- Payload & Metadata Details -->
              <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed">
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
