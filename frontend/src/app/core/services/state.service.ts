import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { FinanceApiService } from './finance-api.service';
import { AuthService } from './auth.service';
import {
  Account,
  Transaction,
  Receipt,
  Budget,
  MonthlyMetrics,
  EventEnvelope
} from '../models/finance.models';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private api = inject(FinanceApiService);
  private auth = inject(AuthService);

  // State Signals
  tenantId = signal<string>('default-user');
  accounts = signal<Account[]>([]);
  transactions = signal<Transaction[]>([]);
  receipts = signal<Receipt[]>([]);
  budgets = signal<Budget[]>([]);
  metrics = signal<MonthlyMetrics | null>(null);
  auditEvents = signal<EventEnvelope[]>([]);
  totalEventCount = signal<number>(0);
  loading = signal<boolean>(false);
  lastRefreshed = signal<Date>(new Date());

  // Computed Derived State
  totalNetWorth = computed(() => {
    return this.accounts().reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  });

  totalMonthlyExpense = computed(() => {
    return this.metrics()?.total_expense || 0;
  });

  totalMonthlyIncome = computed(() => {
    return this.metrics()?.total_income || 0;
  });

  recentTransactions = computed(() => {
    return this.transactions().slice(0, 7);
  });

  pendingReceiptsCount = computed(() => {
    return this.receipts().filter(r => r.status === 'PENDING' || r.status === 'EXTRACTED').length;
  });

  constructor() {
    // Automatically load data when user logs in, or clear when user logs out
    effect(() => {
      if (this.auth.isAuthenticated()) {
        const userTenant = this.auth.currentUser()?.tenantId;
        if (userTenant) {
          this.tenantId.set(userTenant);
        }
        this.refreshAll();
      } else {
        this.accounts.set([]);
        this.transactions.set([]);
        this.receipts.set([]);
        this.budgets.set([]);
        this.metrics.set(null);
        this.auditEvents.set([]);
      }
    });
  }

  setTenantId(newTenantId: string) {
    this.tenantId.set(newTenantId);
    if (this.auth.isAuthenticated()) {
      this.refreshAll();
    }
  }

  refreshAll() {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const tId = this.tenantId();
    this.loading.set(true);

    this.api.getAuditEvents(tId, 50, 0).subscribe({
      next: (res) => {
        this.auditEvents.set(res.events || []);
        this.totalEventCount.set(res.totalEvents || 0);
        this.loading.set(false);
        this.lastRefreshed.set(new Date());
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
