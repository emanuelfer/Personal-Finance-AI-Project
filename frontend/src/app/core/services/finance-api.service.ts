import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Account,
  Transaction,
  MonthlyMetrics,
  Receipt,
  Budget,
  EventEnvelope,
  AdvisorResponse,
  CatalogExpense,
  HouseholdMember
} from '../models/finance.models';


@Injectable({
  providedIn: 'root'
})
export class FinanceApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  private getHeaders(tenantId: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId
    });
  }

  // CQRS Commands
  createAccount(tenantId: string, payload: Partial<Account>): Observable<any> {
    return this.http.post(`${this.baseUrl}/commands/accounts`, payload, {
      headers: this.getHeaders(tenantId)
    });
  }

  recordTransaction(tenantId: string, payload: Partial<Transaction>): Observable<any> {
    return this.http.post(`${this.baseUrl}/commands/transactions`, payload, {
      headers: this.getHeaders(tenantId)
    });
  }

  createBudget(tenantId: string, payload: Partial<Budget>): Observable<any> {
    return this.http.post(`${this.baseUrl}/commands/budgets`, payload, {
      headers: this.getHeaders(tenantId)
    });
  }

  ingestReceipt(tenantId: string, payload: { fileName: string; rawText?: string; contentType?: string; fileSizeBytes?: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/commands/receipts/ingest`, payload, {
      headers: this.getHeaders(tenantId)
    });
  }

  reconcileReceipt(tenantId: string, receiptId: string, payload: { accountId: string; category?: string; merchant?: string; amount?: number; description?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/commands/receipts/${receiptId}/reconcile`, payload, {
      headers: this.getHeaders(tenantId)
    });
  }

  // CQRS Queries
  getAccounts(tenantId: string): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/accounts`, {
      headers: this.getHeaders(tenantId)
    });
  }

  getTransactions(tenantId: string, limit = 50): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.baseUrl}/transactions?limit=${limit}`, {
      headers: this.getHeaders(tenantId)
    });
  }

  getMonthlyMetrics(tenantId: string, month?: string): Observable<MonthlyMetrics> {
    const url = month ? `${this.baseUrl}/metrics/monthly?month=${month}` : `${this.baseUrl}/metrics/monthly`;
    return this.http.get<MonthlyMetrics>(url, {
      headers: this.getHeaders(tenantId)
    });
  }

  getReceipts(tenantId: string): Observable<Receipt[]> {
    return this.http.get<Receipt[]>(`${this.baseUrl}/receipts`, {
      headers: this.getHeaders(tenantId)
    });
  }

  getBudgets(tenantId: string): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.baseUrl}/budgets`, {
      headers: this.getHeaders(tenantId)
    });
  }

  getAuditEvents(tenantId: string, limit = 100, offset = 0): Observable<{ totalEvents: number; events: EventEnvelope[] }> {
    return this.http.get<{ totalEvents: number; events: EventEnvelope[] }>(`${this.baseUrl}/audit/events?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(tenantId)
    });
  }

  // Agentic RAG Advisor
  chatWithAdvisor(tenantId: string, message: string): Observable<AdvisorResponse> {
    return this.http.post<AdvisorResponse>(`${this.baseUrl}/advisor/chat`, { message }, {
      headers: this.getHeaders(tenantId)
    });
  }

  // Spreadsheet Persistence (Zero Data Loss)
  getSpreadsheet(tenantId: string, year: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/spreadsheet/${year}`, {
      headers: this.getHeaders(tenantId)
    });
  }

  saveSpreadsheet(tenantId: string, year: number, payload: { 
    months: any[]; 
    members?: HouseholdMember[];
    baseInitialReserve: number; 
    [key: string]: any;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/spreadsheet/${year}`, {
      ...payload,
      data: payload.months
    }, {
      headers: this.getHeaders(tenantId)
    });
  }

  // Expense Catalog API (Zero Data Loss Catalog CRUD)
  getCatalogExpenses(tenantId: string, owner?: string): Observable<CatalogExpense[]> {
    const url = owner && owner !== 'ALL'
      ? `${this.baseUrl}/catalog/expenses?owner=${encodeURIComponent(owner)}`
      : `${this.baseUrl}/catalog/expenses`;
    return this.http.get<CatalogExpense[]>(url, {
      headers: this.getHeaders(tenantId)
    });
  }

  createCatalogExpense(tenantId: string, item: Partial<CatalogExpense>): Observable<CatalogExpense> {
    return this.http.post<CatalogExpense>(`${this.baseUrl}/catalog/expenses`, item, {
      headers: this.getHeaders(tenantId)
    });
  }

  updateCatalogExpense(tenantId: string, id: string, item: Partial<CatalogExpense>): Observable<CatalogExpense> {
    return this.http.put<CatalogExpense>(`${this.baseUrl}/catalog/expenses/${id}`, item, {
      headers: this.getHeaders(tenantId)
    });
  }

  deleteCatalogExpense(tenantId: string, id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/catalog/expenses/${id}`, {
      headers: this.getHeaders(tenantId)
    });
  }
}




