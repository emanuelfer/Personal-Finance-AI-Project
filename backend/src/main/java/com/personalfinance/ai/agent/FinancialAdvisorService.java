package com.personalfinance.ai.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.personalfinance.ai.gemini.GeminiClient;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
public class FinancialAdvisorService {

    private static final Logger LOG = Logger.getLogger(FinancialAdvisorService.class);

    @Inject
    FinancialAdvisorTools tools;

    @Inject
    GeminiClient geminiClient;

    @Inject
    Tracer tracer;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class ToolExecutionTrace {
        private String toolName;
        private Map<String, Object> arguments;
        private Object result;

        public ToolExecutionTrace(String toolName, Map<String, Object> arguments, Object result) {
            this.toolName = toolName;
            this.arguments = arguments;
            this.result = result;
        }

        public String getToolName() {
            return toolName;
        }

        public Map<String, Object> getArguments() {
            return arguments;
        }

        public Object getResult() {
            return result;
        }
    }

    public static class AdvisorResponse {
        private String reply;
        private List<ToolExecutionTrace> toolTraces;
        private List<String> citations;
        private long responseTimeMs;
        private String modelUsed;

        public AdvisorResponse(String reply, List<ToolExecutionTrace> toolTraces, List<String> citations, long responseTimeMs, String modelUsed) {
            this.reply = reply;
            this.toolTraces = toolTraces;
            this.citations = citations;
            this.responseTimeMs = responseTimeMs;
            this.modelUsed = modelUsed;
        }

        public String getReply() {
            return reply;
        }

        public List<ToolExecutionTrace> getToolTraces() {
            return toolTraces;
        }

        public List<String> getCitations() {
            return citations;
        }

        public long getResponseTimeMs() {
            return responseTimeMs;
        }

        public String getModelUsed() {
            return modelUsed;
        }
    }

    public AdvisorResponse advise(String tenantId, String userMessage) {
        long start = System.currentTimeMillis();
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("FinancialAdvisorService.advise")
                    .setAttribute("tenant.id", tenantId)
                    .setAttribute("user.query", userMessage)
                    .startSpan();
        }

        List<ToolExecutionTrace> traces = new ArrayList<>();
        List<String> citations = new ArrayList<>();

        try {
            String lower = userMessage.toLowerCase();
            int detectedYear = FinancialAdvisorTools.resolveYear(userMessage, 2026);
            String detectedMonth = FinancialAdvisorTools.resolveMonth(userMessage);

            // 1. Tool Execution: Spreadsheet Financial State for detected year (or base 2026)
            Map<String, Object> spreadsheetState = tools.getSpreadsheetFinancialState(tenantId, detectedYear);
            traces.add(new ToolExecutionTrace("getSpreadsheetFinancialState", Map.of("tenantId", tenantId, "year", detectedYear), spreadsheetState));
            citations.add(String.format("Spreadsheet %d State (%s)", detectedYear, ((Boolean) spreadsheetState.getOrDefault("found", false)) ? "PostgreSQL Verified" : "Forward Model Projected"));

            // 2. Savings & Emergency Reserve Evaluation (Dynamic Multi-Year Month-by-Month Matrix)
            Map<String, Object> savingsHealth = tools.evaluateSavingsHealth(tenantId, detectedYear, detectedMonth);
            traces.add(new ToolExecutionTrace("evaluateSavingsHealth", Map.of("tenantId", tenantId, "year", detectedYear, "requestedMonth", detectedMonth), savingsHealth));
            citations.add(String.format("Multi-Year Runway & Cashflow Engine (%s/%d)", detectedMonth, detectedYear));

            // 3. Purchase Timing & Long-Term Goal Simulation (Cars, Real Estate, Devices)
            double purchaseAmount = extractAmount(userMessage);
            Map<String, Object> purchaseEvaluation = null;
            boolean isPurchaseQuery = purchaseAmount > 0 || lower.contains("comprar") || lower.contains("compra") ||
                    lower.contains("buy") || lower.contains("carro") || lower.contains("car") || lower.contains("imovel") ||
                    lower.contains("apartamento") || lower.contains("iphone") || lower.contains("gastar");

            if (isPurchaseQuery) {
                double targetAmount = purchaseAmount > 0 ? purchaseAmount : (lower.contains("carro") || lower.contains("car") ? 80000.00 : (lower.contains("iphone") ? 9500.00 : 15000.00));
                purchaseEvaluation = tools.evaluatePurchaseTiming(tenantId, targetAmount, detectedMonth, detectedYear);
                traces.add(new ToolExecutionTrace("evaluatePurchaseTiming", Map.of("tenantId", tenantId, "amount", targetAmount, "targetMonth", detectedMonth, "targetYear", detectedYear), purchaseEvaluation));
                citations.add(String.format("Multi-Year Purchase & Capital de Giro Simulator (%d)", detectedYear));
            }

            // 4. Semantic Search across Vector Store if user asks about past expenses or specific items
            if (lower.contains("historico") || lower.contains("busca") || lower.contains("recibo") || lower.contains("pesquisa") || lower.contains("find") || lower.contains("search")) {
                List<Map<String, Object>> searchResults = tools.searchFinancialHistory(tenantId, userMessage, 4);
                traces.add(new ToolExecutionTrace("searchFinancialHistory", Map.of("tenantId", tenantId, "query", userMessage), searchResults));
                citations.add("pgvector HNSW Semantic Similarity Index");
            }

            // 5. Build Comprehensive Dynamic Financial Context for Gemini
            Map<String, Object> contextMap = new HashMap<>();
            contextMap.put("anoConsultado", detectedYear);
            contextMap.put("mesConsultado", detectedMonth);
            contextMap.put("isAnoProjetadoFuturo", detectedYear > 2026);
            contextMap.put("analisePeriodoFoco", savingsHealth);
            contextMap.put("tabelaMensalPeriodo", savingsHealth.get("monthlyEvolution"));
            if (purchaseEvaluation != null) {
                contextMap.put("simulacaoAquisicao", purchaseEvaluation);
            }

            String financialContextJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(contextMap);

            String systemInstruction = """
                You are the Senior Personal Wealth & Multi-Year Strategic Financial Advisor for the household.
                Your purpose is to provide highly analytical, exact, empathetic, and forward-looking financial advice regarding short-term cashflow (2026) and long-term multi-year projections (2027, 2028, 2030+) for emergency reserves, capital de giro, and major acquisitions (such as cars, real estate, major investments, or devices).
                
                Mandatory Financial Rules & Principles:
                1. Multi-Year Horizon Awareness:
                   - For 2026: Reference the real spreadsheet data.
                   - For future years (2027, 2028, 2030+): Acknowledge that the numbers reflect a robust forward compound projection model starting from late 2026 balances, factoring in recurring savings and seasonality (such as 13th salary in Nov/Dec).
                2. Major Purchase Evaluation (e.g., Cars R$ 50k–R$ 150k, Devices, Property Down Payments):
                   - Contrast the purchase value against the projected Emergency Reserve in that target year/month.
                   - Minimum Safety Buffer Rule: The family must always preserve at least 6 months of living expenses in their Emergency Reserve.
                   - If paying in cash (à vista) leaves < 6 months runway, recommend a balanced strategy: Down payment (e.g. 30% to 50%) + Financing in 24x/36x, or waiting for year-end bonuses.
                3. Distinct Concepts:
                   - "Working Capital" / "Capital de Giro": The operational cashflow buffer configured for household members.
                   - "Emergency Reserve" / "Reserva de Emergência" / "Caixa Final": The cumulative protected cushion.
                4. Exact Numbers: Quote the exact calculated values provided in the JSON context (e.g., projected reserve, monthly burn, runway months, suggested down payments and installments).
                5. Output Language & Tone: Reply in the same language the user asked in (Portuguese for Portuguese queries, English for English). Use clear markdown headings, bullet points, key takeaways, and emojis.
            """;

            // 6. Invoke Google Gemini 3.5 Flash Lite
            String geminiAdvice = geminiClient.generateAdvice(systemInstruction, userMessage, financialContextJson);

            if (geminiAdvice != null && !geminiAdvice.isBlank()) {
                long elapsed = System.currentTimeMillis() - start;
                return new AdvisorResponse(geminiAdvice, traces, citations, elapsed, "Google Gemini 3.5 Flash Lite (Direct API)");
            }

            // 7. Fallback only if Gemini API is unreachable
            LOG.warn("Gemini API did not return response. Using local fallback engine.");
            String localReply = generateDeterministicAdvice(lower, purchaseAmount > 0 ? purchaseAmount : (lower.contains("carro") ? 80000.00 : 9500.00), detectedYear, detectedMonth, savingsHealth, purchaseEvaluation);
            long elapsed = System.currentTimeMillis() - start;
            return new AdvisorResponse(localReply, traces, citations, elapsed, "Personal Finance Expert Engine (Local Fallback)");

        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error in FinancialAdvisorService for tenant %s", tenantId);
            long elapsed = System.currentTimeMillis() - start;
            return new AdvisorResponse("Sorry, an error occurred while analyzing your financial records. Please try again.", traces, citations, elapsed, "Fallback");
        } finally {
            if (span != null) span.end();
        }
    }

    private double extractAmount(String text) {
        try {
            Pattern currPattern = Pattern.compile("(?:r\\$|\\$)\\s*(\\d+(?:[.,]\\d{3})*(?:[.,]\\d{2})?|\\d+)");
            Matcher currMatcher = currPattern.matcher(text.toLowerCase());
            if (currMatcher.find()) {
                String match = currMatcher.group(1).replace(".", "").replace(",", ".");
                return Double.parseDouble(match);
            }

            Pattern kPattern = Pattern.compile("(\\d+)\\s*(?:k|mil)");
            Matcher kMatcher = kPattern.matcher(text.toLowerCase());
            if (kMatcher.find()) {
                return Double.parseDouble(kMatcher.group(1)) * 1000.0;
            }

            Pattern numPattern = Pattern.compile("\\b(\\d{3,6})\\b");
            Matcher numMatcher = numPattern.matcher(text);
            while (numMatcher.find()) {
                double val = Double.parseDouble(numMatcher.group(1));
                if (val >= 2020 && val <= 2035) {
                    continue;
                }
                return val;
            }
        } catch (Exception ignored) {
        }
        return 0.0;
    }

    private String generateDeterministicAdvice(String query, double amount, int year, String mes, Map<String, Object> savings, Map<String, Object> purchase) {
        StringBuilder sb = new StringBuilder();

        boolean isPurchase = query.contains("comprar") || query.contains("compra") || query.contains("buy") || amount > 0 || query.contains("carro") || query.contains("iphone");
        boolean isRunway = query.contains("duraria") || query.contains("quanto tempo") || query.contains("sem receita") || query.contains("runway") || query.contains("duração");

        double totalRes = savings.containsKey("caixaFinalMesUnificado") ? (Double) savings.get("caixaFinalMesUnificado") : 54884.27;
        double totalGiro = savings.containsKey("capitalGiroMesUnificado") ? (Double) savings.get("capitalGiroMesUnificado") : 12789.05;

        double burnTotal = savings.containsKey("gastosMensaisMesTotal") ? (Double) savings.get("gastosMensaisMesTotal") : 11014.44;
        double runwayRes = savings.containsKey("runwayMesesApenasReserva") ? (Double) savings.get("runwayMesesApenasReserva") : 4.98;
        double runwayLiq = savings.containsKey("runwayMesesLiquidezTotal") ? (Double) savings.get("runwayMesesLiquidezTotal") : 6.14;

        if (isPurchase) {
            double purchaseVal = amount > 0 ? amount : 80000.00;
            sb.append(String.format("### 🚗 Avaliação de Aquisição: **R$ %,.2f** (%s/%d)\n\n", purchaseVal, mes, year));
            sb.append(String.format("Projeção para o período de **%s/%d**:\n\n", mes, year));
            sb.append(String.format("- 🛡️ **Reserva de Emergência Projetada:** `R$ %,.2f`\n", totalRes));
            sb.append(String.format("- 💼 **Capital de Giro Projetado:** `R$ %,.2f`\n", totalGiro));
            sb.append(String.format("- 📉 **Gastos Mensais Familiares:** `R$ %,.2f`\n\n", burnTotal));

            boolean canPayInFull = (totalRes - purchaseVal) >= (burnTotal * 6.0);
            if (canPayInFull) {
                sb.append("✅ **Diagnóstico: Compra À Vista 100% Viável**\n");
                sb.append(String.format("Mesmo pagando R$ %,.2f à vista, sobrará uma reserva de **R$ %,.2f** (equivalente a **%.1f meses** de cobertura).\n",
                        purchaseVal, totalRes - purchaseVal, (totalRes - purchaseVal) / burnTotal));
            } else {
                sb.append("⚠️ **Diagnóstico: Entrada + Financiamento Recomendado**\n");
                sb.append(String.format("Pagar 100%% à vista comprometeria o colchão mínimo de segurança de 6 meses (R$ %,.2f).\n\n", burnTotal * 6.0));
                sb.append(String.format("💡 **Estratégia Recomendada:**\n"));
                sb.append(String.format("- **Entrada (50%%):** R$ %,.2f (preserva sua reserva segura).\n", purchaseVal * 0.5));
                sb.append(String.format("- **Financiamento do Saldo:** 24x de aprox. R$ %,.2f ou 36x de aprox. R$ %,.2f.\n", (purchaseVal * 0.5 * 1.18) / 24.0, (purchaseVal * 0.5 * 1.28) / 36.0));
            }
        } else if (isRunway) {
            sb.append(String.format("### ⏳ Duração da Reserva de Emergência em %s/%d\n\n", mes, year));
            sb.append(String.format("Considerando os gastos mensais projetados de **R$ %,.2f** em %s/%d:\n\n", burnTotal, mes, year));
            sb.append(String.format("- 🛡️ **Apenas com a Reserva de Emergência (R$ %,.2f):** Dura **%.1f meses**.\n", totalRes, runwayRes));
            sb.append(String.format("- 💼 **Com a Liquidez Total (Reserva + Capital de Giro = R$ %,.2f):** Dura **%.1f meses**.\n", totalRes + totalGiro, runwayLiq));
        } else {
            sb.append(String.format("### 📈 Projeção Patrimonial — %s/%d\n\n", mes, year));
            sb.append(String.format("- **Reserva de Emergência:** `R$ %,.2f` (Runway: `%.1f meses`)\n", totalRes, runwayRes));
            sb.append(String.format("- **Capital de Giro:** `R$ %,.2f`\n", totalGiro));
            sb.append(String.format("- **Gastos Mensais:** `R$ %,.2f` | **Rendimentos:** `R$ %,.2f`\n", burnTotal, (Double) savings.getOrDefault("rendimentosMensaisMesTotal", 10900.0)));
        }

        return sb.toString();
    }
}
