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
    <div class="h-[calc(100vh-7.5rem)] flex flex-col space-y-3 max-w-5xl mx-auto">
      
      <!-- Top Advisor Header -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-500/20">
            ✨
          </div>
          <div>
            <h1 class="text-base font-bold text-white flex items-center gap-2">
              AI Financial Advisor &amp; Counselor
              <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Google Gemini AI
              </span>
            </h1>
            <p class="text-xs text-slate-400">Conselheiro financeiro inteligente fundamentado no seu planejamento multi-anual</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="clearChat()" class="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition cursor-pointer">
            Limpar Conversa
          </button>
        </div>
      </div>

      <!-- Quick Smart Financial Prompt Chips -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="text-[11px] font-mono text-slate-500 mr-1">Sugestões:</span>
        <button (click)="sendPreset('É um bom momento para comprar algo de R$ 5.000 agora ou qual o melhor mês?')"
                class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm">
          🛍️ <span>Simulação de Compra (R$ 5.000)</span>
        </button>
        <button (click)="sendPreset('Como está a nossa reserva de emergência e economia familiar? Temos uma boa quantia guardada?')"
                class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm">
          🏦 <span>Diagnóstico da Reserva &amp; Economia</span>
        </button>
        <button (click)="sendPreset('Qual o melhor mês em 2026 para fazer compras de alto valor sem comprometer o Capital de Giro?')"
                class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm">
          📈 <span>Melhor Momento para Compras em 2026</span>
        </button>
        <button (click)="sendPreset('Me dê 3 dicas práticas para otimizar nossas despesas e aumentar o capital de giro residual.')"
                class="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm">
          💡 <span>Dicas de Otimização Financeira</span>
        </button>
      </div>

      <!-- Chat History Stream -->
      <div class="flex-1 bg-slate-950/60 border border-slate-800/60 backdrop-blur-xl rounded-3xl p-5 overflow-y-auto space-y-4 shadow-inner">
        
        @if (messages.length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl">
              ✨
            </div>
            <div class="max-w-md">
              <p class="text-sm font-semibold text-slate-200">Olá! Eu sou o seu Consultor Financeiro AI</p>
              <p class="text-xs text-slate-400 mt-1">
                Conectado diretamente ao Google Gemini 1.5 e aos dados em tempo real da sua planilha 2026. Posso te ajudar a avaliar o melhor momento para compras, calcular a saúde da sua reserva de emergência e otimizar seu capital de giro.
              </p>
            </div>
          </div>
        }

        @for (msg of messages; track msg.id) {
          <div class="flex flex-col space-y-1.5" [class.items-end]="msg.sender === 'user'" [class.items-start]="msg.sender === 'agent'">
            
            <div class="flex items-center gap-2 text-[10px] text-slate-500 font-mono px-1">
              <span>{{ msg.sender === 'user' ? 'VOCÊ' : (msg.modelUsed || 'AI ADVISOR') }}</span>
              <span>•</span>
              <span>{{ msg.timestamp | date:'HH:mm' }}</span>
              @if (msg.responseTimeMs) {
                <span>•</span>
                <span class="text-emerald-400 font-bold">{{ msg.responseTimeMs }}ms</span>
              }
            </div>

            <!-- Message Bubble -->
            <div class="max-w-2xl rounded-3xl p-4 text-sm leading-relaxed shadow-md"
                 [ngClass]="msg.sender === 'user' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'">
              
              <!-- Content -->
              <div class="whitespace-pre-line prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed">{{ msg.content }}</div>

              <!-- Tool Execution Traces -->
              @if (msg.toolTraces && msg.toolTraces.length > 0) {
                <div class="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                  <div class="text-[11px] font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Fontes &amp; Ferramentas Consultadas ({{ msg.toolTraces.length }}):</span>
                  </div>

                  <div class="space-y-1">
                    @for (tool of msg.toolTraces; track tool.toolName) {
                      <div class="bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 text-xs font-mono">
                        <div class="text-emerald-400 font-bold flex items-center justify-between">
                          <span>⚡ {{ tool.toolName }}()</span>
                          <span class="text-[10px] text-slate-500 font-normal">Executado</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Citations -->
              @if (msg.citations && msg.citations.length > 0) {
                <div class="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span class="text-[10px] text-slate-500 font-mono">Contexto:</span>
                  @for (cite of msg.citations; track cite) {
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-cyan-400 border border-slate-800 font-mono">
                      {{ cite }}
                    </span>
                  }
                </div>
              }

            </div>

          </div>
        }

        @if (thinking) {
          <div class="flex items-center space-x-2.5 text-xs text-purple-400 font-mono bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-purple-500/30 w-fit animate-pulse">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span>Consultando Google Gemini 1.5 e simulando fluxo de caixa...</span>
          </div>
        }

      </div>

      <!-- Input Bar -->
      <div class="bg-slate-900/90 border border-slate-800/80 p-2 rounded-2xl flex items-center gap-2 shadow-xl">
        <input type="text" [(ngModel)]="userQuery" (keyup.enter)="sendMessage()" [disabled]="thinking"
               placeholder="Pergunte sobre momento de compras, reserva de emergência, dicas de economia..."
               class="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none" />
        
        <button (click)="sendMessage()" [disabled]="thinking || !userQuery.trim()"
                class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer">
          <span>Enviar</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
