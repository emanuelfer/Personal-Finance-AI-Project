import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../core/services/state.service';
import { FinanceApiService } from '../../core/services/finance-api.service';
import { ChatMessage } from '../../core/models/finance.models';

@Component({
  selector: 'app-advisor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-[calc(100vh-8.5rem)] flex flex-col space-y-3.5 max-w-5xl mx-auto">
      
      <!-- Top Advisor Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Consultor Financeiro &amp; Planejamento de Caixa</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5 font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Gemini Core</span>
              </span>
            </h1>
            <p class="text-xs text-slate-400">Análise determinística e simulação fundamentada na sua planilha financeira e reservas</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="clearChat()" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition cursor-pointer">
            Limpar Conversa
          </button>
        </div>
      </div>

      <!-- Quick Smart Financial Prompt Chips -->
      <div class="flex flex-wrap items-center gap-1.5 text-xs">
        <span class="text-[11px] font-mono text-slate-500 mr-1">Sugestões:</span>
        <button (click)="sendPreset('É um bom momento para comprar algo de R$ 5.000 agora ou qual o melhor mês?')"
                class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Simulação de Compra (R$ 5.000)</span>
        </button>
        <button (click)="sendPreset('Como está a nossa reserva de emergência e economia familiar? Temos uma boa quantia guardada?')"
                class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Diagnóstico da Reserva &amp; Economia</span>
        </button>
        <button (click)="sendPreset('Qual o melhor mês em 2026 para fazer compras de alto valor sem comprometer o Capital de Giro?')"
                class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Melhor Momento para Compras em 2026</span>
        </button>
        <button (click)="sendPreset('Me dê 3 dicas práticas para otimizar nossas despesas e aumentar o capital de giro residual.')"
                class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs">
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Otimização de Despesas</span>
        </button>
      </div>

      <!-- Chat History Stream -->
      <div class="flex-1 bg-[#090e1a] border border-slate-800/80 rounded-xl p-4 sm:p-5 overflow-y-auto space-y-4">
        
        @if (messages.length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3 py-10">
            <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div class="max-w-md">
              <p class="text-sm font-semibold text-slate-300">Consultor Financeiro</p>
              <p class="text-xs text-slate-400 mt-1">
                Conectado aos dados da planilha e às regras de capital de giro e reserva de emergência. Pergunte sobre momentos oportunos para aquisições, saúde financeira familiar ou otimização de fluxo de caixa.
              </p>
            </div>
          </div>
        }

        @for (msg of messages; track msg.id) {
          <div class="flex flex-col space-y-1" [class.items-end]="msg.sender === 'user'" [class.items-start]="msg.sender === 'agent'">
            
            <div class="flex items-center gap-2 text-[10px] text-slate-500 font-mono tabular-nums px-1">
              <span>{{ msg.sender === 'user' ? 'VOCÊ' : (msg.modelUsed || 'CONSULTOR') }}</span>
              <span>&bull;</span>
              <span>{{ msg.timestamp | date:'HH:mm' }}</span>
              @if (msg.responseTimeMs) {
                <span>&bull;</span>
                <span class="text-slate-400 font-medium">{{ msg.responseTimeMs }}ms</span>
              }
            </div>

            <!-- Message Bubble -->
            <div class="max-w-2xl rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed"
                 [ngClass]="msg.sender === 'user' ? 'bg-slate-800 border border-slate-700/80 text-slate-100' : 'bg-[#0c1322] border border-slate-800 text-slate-200'">
              
              <!-- Content -->
              <div class="whitespace-pre-line prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed">{{ msg.content }}</div>

              <!-- Tool Execution Traces -->
              @if (msg.toolTraces && msg.toolTraces.length > 0) {
                <div class="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                  <div class="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Fontes &amp; Ferramentas Consultadas ({{ msg.toolTraces.length }}):</span>
                  </div>

                  <div class="space-y-1">
                    @for (tool of msg.toolTraces; track tool.toolName) {
                      <div class="bg-[#060913] p-2 rounded-lg border border-slate-800/80 text-xs font-mono">
                        <div class="text-slate-300 font-medium flex items-center justify-between">
                          <span>{{ tool.toolName }}()</span>
                          <span class="text-[10px] text-emerald-400">OK</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Citations -->
              @if (msg.citations && msg.citations.length > 0) {
                <div class="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] text-slate-500 font-mono">Contexto:</span>
                  @for (cite of msg.citations; track cite) {
                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                      {{ cite }}
                    </span>
                  }
                </div>
              }

            </div>

          </div>
        }

        @if (thinking) {
          <div class="flex items-center space-x-2 text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 w-fit">
            <svg class="w-3.5 h-3.5 animate-spin text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Analisando planilha e simulando fluxo de caixa...</span>
          </div>
        }

      </div>

      <!-- Input Bar -->
      <div class="bg-[#0c1322] border border-slate-800 p-2 rounded-xl flex items-center gap-2">
        <input type="text" [(ngModel)]="userQuery" (keyup.enter)="sendMessage()" [disabled]="thinking"
               placeholder="Pergunte sobre momento de compras, reserva de emergência ou dicas de economia..."
               class="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
        
        <button (click)="sendMessage()" [disabled]="thinking || !userQuery.trim()"
                class="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5 border border-emerald-600/30 cursor-pointer">
          <span>Enviar</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

    </div>
  `
})
export class AdvisorComponent {
  state = inject(StateService);
  api = inject(FinanceApiService);

  userQuery = '';
  thinking = false;

  messages: ChatMessage[] = [];

  constructor() {
    this.messages.push({
      id: 'welcome',
      sender: 'agent',
      content: 'Olá! Sou o seu Consultor Financeiro AI. Tenho acesso aos dados consolidados da sua planilha de 2026, Reserva de Emergência (R$ 15.500) e Capital de Giro.\n\nComo posso te ajudar hoje? Você pode me perguntar se é um bom momento para comprar algum item, como está a sua reserva, ou pedir dicas para otimizar suas finanças.',
      timestamp: new Date(),
      modelUsed: 'Google Gemini 1.5 Flash'
    });
  }

  sendPreset(prompt: string) {
    this.userQuery = prompt;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userQuery.trim();
    if (!text || this.thinking) return;

    this.messages.push({
      id: 'user-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: new Date()
    });

    this.userQuery = '';
    this.thinking = true;

    this.api.chatWithAdvisor(this.state.tenantId(), text).subscribe({
      next: (res) => {
        this.thinking = false;
        this.messages.push({
          id: 'agent-' + Date.now(),
          sender: 'agent',
          content: res.reply,
          toolTraces: res.toolTraces,
          citations: res.citations,
          responseTimeMs: res.responseTimeMs,
          modelUsed: res.modelUsed,
          timestamp: new Date()
        });
      },
      error: () => {
        this.thinking = false;
        this.messages.push({
          id: 'err-' + Date.now(),
          sender: 'agent',
          content: 'Desculpe, ocorreu um erro ao conectar com o serviço de inteligência financeira. Verifique se o backend está ativo.',
          timestamp: new Date()
        });
      }
    });
  }

  clearChat() {
    this.messages = [];
  }
}
