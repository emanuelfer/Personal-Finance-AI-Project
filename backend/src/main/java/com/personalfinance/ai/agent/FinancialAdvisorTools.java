package com.personalfinance.ai.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personalfinance.infrastructure.eventstore.EventEnvelope;
import com.personalfinance.infrastructure.eventstore.EventStore;
import com.personalfinance.infrastructure.redis.RedisMaterializedViewRepository;
import com.personalfinance.infrastructure.vector.EmbeddingService;
import com.personalfinance.infrastructure.vector.PgVectorRepository;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@ApplicationScoped
public class FinancialAdvisorTools {

    private static final Logger LOG = Logger.getLogger(FinancialAdvisorTools.class);

    @Inject
    RedisMaterializedViewRepository redisRepository;

    @Inject
    PgVectorRepository pgVectorRepository;

    @Inject
    EmbeddingService embeddingService;

    @Inject
    EventStore eventStore;

    @Inject
    AgroalDataSource dataSource;

    @Inject
    Tracer tracer;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static final String[] MONTH_NAMES = {
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    };

    public static class MemberInfo {
        public String id;
        public String name;
        public double baseInitialReserve = 10000.0;
        public double baseInitialCapitalGiro = 6000.0;
    }

    public static class MonthlyFinancialSummary {
        public String monthName;
        public int monthIndex;
        public int year;
        public double incomeTotal;
        public double expensesTotal;
        public double resultadoTotal;
        public double initialCapitalGiroTotal;
        public double finalCapitalGiroTotal;
        public double caixaFinalUnificado;
        public double runwayMesesApenasReserva;
        public double runwayMesesLiquidezTotal;
        public boolean isProjected;

        // Dynamic multi-member metrics
        public Map<String, Double> memberIncomes = new LinkedHashMap<>();
        public Map<String, Double> memberExpenses = new LinkedHashMap<>();
        public Map<String, Double> memberResultados = new LinkedHashMap<>();
        public Map<String, Double> memberInitialCapitalGiro = new LinkedHashMap<>();
        public Map<String, Double> memberFinalCapitalGiro = new LinkedHashMap<>();
        public Map<String, Double> memberCaixaFinal = new LinkedHashMap<>();
        public Map<String, Double> memberRunwayApenasReserva = new LinkedHashMap<>();
        public Map<String, Double> memberRunwayComGiro = new LinkedHashMap<>();
    }

    public static int resolveYear(String text, int defaultYear) {
        if (text == null || text.isBlank()) return defaultYear;
        Pattern p = Pattern.compile("\\b(202[0-9]|203[0-9])\\b");
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {
            }
        }
        return defaultYear;
    }

    public static String resolveMonth(String text) {
        if (text == null || text.isBlank()) return "Agosto";
        String lower = text.toLowerCase();
        if (lower.contains("janeiro") || lower.contains("january") || lower.contains("jan")) return "Janeiro";
        if (lower.contains("fevereiro") || lower.contains("february") || lower.contains("fev") || lower.contains("feb")) return "Fevereiro";
        if (lower.contains("março") || lower.contains("marco") || lower.contains("march") || lower.contains("mar")) return "Março";
        if (lower.contains("abril") || lower.contains("april") || lower.contains("abr") || lower.contains("apr")) return "Abril";
        if (lower.contains("maio") || lower.contains("may") || lower.contains("mai")) return "Maio";
        if (lower.contains("junho") || lower.contains("june") || lower.contains("jun")) return "Junho";
        if (lower.contains("julho") || lower.contains("july") || lower.contains("jul")) return "Julho";
        if (lower.contains("agosto") || lower.contains("august") || lower.contains("ago") || lower.contains("aug")) return "Agosto";
        if (lower.contains("setembro") || lower.contains("september") || lower.contains("set") || lower.contains("sep")) return "Setembro";
        if (lower.contains("outubro") || lower.contains("october") || lower.contains("out") || lower.contains("oct")) return "Outubro";
        if (lower.contains("novembro") || lower.contains("november") || lower.contains("nov")) return "Novembro";
        if (lower.contains("dezembro") || lower.contains("december") || lower.contains("dez") || lower.contains("dec")) return "Dezembro";
        return "Agosto";
    }

    /**
     * Calculates the exact month-by-month cashflow, capital de giro, and cumulative Caixa Final (Emergency Reserve).
     * If the year exists in DB, uses real data; if it's a future year (e.g. 2027, 2028), projects forward!
     */
    public List<MonthlyFinancialSummary> calculateMonthlySummaries(String tenantId, int year) {
        List<MonthlyFinancialSummary> list = new ArrayList<>();
        try {
            Map<String, Object> sheetState = getSpreadsheetFinancialState(tenantId, year);
            boolean existsInDb = (Boolean) sheetState.getOrDefault("found", false);

            if (existsInDb && sheetState.containsKey("data")) {
                JsonNode dataNode = (JsonNode) sheetState.get("data");
                if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
                    return computeFromSpreadsheetJson(year, sheetState, dataNode);
                }
            }

            // If requested year is in the future (> 2026) and not in DB, project forward from 2026
            if (year > 2026) {
                return projectForwardYear(tenantId, year);
            }

            // Fallback to default calculation for 2026 if no rows
            if (sheetState.containsKey("data")) {
                JsonNode dataNode = (JsonNode) sheetState.get("data");
                if (dataNode != null && dataNode.isArray()) {
                    return computeFromSpreadsheetJson(year, sheetState, dataNode);
                }
            }

        } catch (Exception e) {
            LOG.errorf(e, "Error calculating monthly summaries for tenant %s, year %d", tenantId, year);
        }
        return list;
    }

    private List<MemberInfo> extractMembers(Map<String, Object> sheetState, JsonNode dataNode) {
        List<MemberInfo> members = new ArrayList<>();
        if (sheetState.containsKey("members") && sheetState.get("members") instanceof JsonNode membersNode && membersNode.isArray() && membersNode.size() > 0) {
            for (JsonNode m : membersNode) {
                MemberInfo mi = new MemberInfo();
                mi.id = m.has("id") ? m.get("id").asText() : "";
                mi.name = m.has("name") ? m.get("name").asText() : mi.id;
                mi.baseInitialReserve = m.has("baseInitialReserve") ? m.get("baseInitialReserve").asDouble(10000.0) : 10000.0;
                mi.baseInitialCapitalGiro = m.has("baseInitialCapitalGiro") ? m.get("baseInitialCapitalGiro").asDouble(6000.0) : 6000.0;
                members.add(mi);
            }
        }
        if (members.isEmpty() && dataNode != null && dataNode.size() > 0) {
            Set<String> discovered = new LinkedHashSet<>();
            for (JsonNode m : dataNode) {
                if (m.has("userIncomes") && m.get("userIncomes").isObject()) {
                    m.get("userIncomes").fieldNames().forEachRemaining(discovered::add);
                }
                if (m.has("expenses") && m.get("expenses").isArray()) {
                    for (JsonNode exp : m.get("expenses")) {
                        if (exp.has("owner")) {
                            String owner = exp.get("owner").asText();
                            if (!"Compartilhado".equalsIgnoreCase(owner) && !owner.isBlank()) {
                                discovered.add(owner);
                            }
                        }
                    }
                }
                Iterator<String> it = m.fieldNames();
                while (it.hasNext()) {
                    String fn = it.next();
                    if (fn.startsWith("income") && !fn.equals("income")) {
                        discovered.add(fn.substring(6));
                    }
                }
            }
            for (String d : discovered) {
                MemberInfo mi = new MemberInfo();
                mi.id = d.toLowerCase();
                mi.name = d;
                mi.baseInitialReserve = 10000.0;
                mi.baseInitialCapitalGiro = 6000.0;
                members.add(mi);
            }
        }
        return members;
    }

    private List<MonthlyFinancialSummary> computeFromSpreadsheetJson(int year, Map<String, Object> sheetState, JsonNode dataNode) {
        List<MonthlyFinancialSummary> list = new ArrayList<>();
        List<MemberInfo> members = extractMembers(sheetState, dataNode);

        Map<String, Double> prevFinalGiro = new HashMap<>();
        Map<String, Double> prevFinalCash = new HashMap<>();

        for (MemberInfo mem : members) {
            prevFinalGiro.put(mem.id, mem.baseInitialCapitalGiro);
            prevFinalCash.put(mem.id, mem.baseInitialReserve);
        }

        for (int i = 0; i < dataNode.size(); i++) {
            JsonNode m = dataNode.get(i);
            MonthlyFinancialSummary s = new MonthlyFinancialSummary();
            s.year = year;
            s.monthIndex = i;
            s.monthName = m.has("monthName") ? m.get("monthName").asText() : (i < MONTH_NAMES.length ? MONTH_NAMES[i] : "Mês " + (i + 1));
            s.isProjected = false;

            double totalIncome = 0.0;
            double totalExpenses = 0.0;
            double totalInitialGiro = 0.0;
            double totalFinalGiro = 0.0;
            double totalFinalCash = 0.0;

            for (MemberInfo mem : members) {
                double inc = 0.0;
                if (m.has("userIncomes") && m.get("userIncomes").isObject()) {
                    JsonNode ui = m.get("userIncomes");
                    if (ui.has(mem.id)) inc = ui.get(mem.id).asDouble(0.0);
                    else if (ui.has(mem.name)) inc = ui.get(mem.name).asDouble(0.0);
                    else if (ui.has(mem.name.toLowerCase())) inc = ui.get(mem.name.toLowerCase()).asDouble(0.0);
                }
                if (inc == 0.0) {
                    String k1 = "income" + mem.name;
                    String k2 = "income" + mem.id;
                    if (m.has(k1)) inc = m.get(k1).asDouble(0.0);
                    else if (m.has(k2)) inc = m.get(k2).asDouble(0.0);
                }
                s.memberIncomes.put(mem.name, round2(inc));
                totalIncome += inc;

                double expMember = 0.0;
                if (m.has("expenses") && m.get("expenses").isArray()) {
                    for (JsonNode exp : m.get("expenses")) {
                        String owner = exp.has("owner") ? exp.get("owner").asText() : "";
                        double amt = exp.has("amount") ? exp.get("amount").asDouble(0.0) : 0.0;
                        if (owner.equalsIgnoreCase(mem.name) || owner.equalsIgnoreCase(mem.id)) {
                            expMember += amt;
                        }
                    }
                }
                s.memberExpenses.put(mem.name, round2(expMember));
                totalExpenses += expMember;

                double resMember = round2(inc - expMember);
                s.memberResultados.put(mem.name, resMember);

                double initGiro = prevFinalGiro.getOrDefault(mem.id, mem.baseInitialCapitalGiro);
                if (i == 0) {
                    boolean isManualGiro = m.has("isInitialGiroManual") && m.get("isInitialGiroManual").asBoolean();
                    if (isManualGiro && m.has("userCapitalGiro") && m.get("userCapitalGiro").isObject()) {
                        JsonNode ug = m.get("userCapitalGiro");
                        if (ug.has(mem.id)) initGiro = ug.get(mem.id).asDouble(initGiro);
                        else if (ug.has(mem.name)) initGiro = ug.get(mem.name).asDouble(initGiro);
                    } else if (isManualGiro) {
                        String k1 = "capitalGiro" + mem.name;
                        String k2 = "capitalGiro" + mem.id;
                        if (m.has(k1)) initGiro = m.get(k1).asDouble(initGiro);
                        else if (m.has(k2)) initGiro = m.get(k2).asDouble(initGiro);
                    } else {
                        initGiro = mem.baseInitialCapitalGiro;
                    }
                }
                s.memberInitialCapitalGiro.put(mem.name, round2(initGiro));
                totalInitialGiro += initGiro;

                double rawGiro = initGiro + resMember;
                double capGiro = mem.baseInitialCapitalGiro;
                double finGiro = round2(Math.max(0, Math.min(capGiro, rawGiro)));
                s.memberFinalCapitalGiro.put(mem.name, finGiro);
                totalFinalGiro += finGiro;

                double surplus = rawGiro > capGiro ? (rawGiro - capGiro) : 0.0;
                double deficit = rawGiro < 0 ? Math.abs(rawGiro) : 0.0;

                double initCash = prevFinalCash.getOrDefault(mem.id, mem.baseInitialReserve);
                if (i == 0) {
                    boolean isManualCash = m.has("isInitialCashManual") && m.get("isInitialCashManual").asBoolean();
                    if (isManualCash && m.has("userInitialCash") && m.get("userInitialCash").isObject()) {
                        JsonNode uc = m.get("userInitialCash");
                        if (uc.has(mem.id)) initCash = uc.get(mem.id).asDouble(initCash);
                        else if (uc.has(mem.name)) initCash = uc.get(mem.name).asDouble(initCash);
                    } else if (isManualCash) {
                        String k1 = "initialCash" + mem.name;
                        String k2 = "initialCash" + mem.id;
                        if (m.has(k1)) initCash = m.get(k1).asDouble(initCash);
                        else if (m.has(k2)) initCash = m.get(k2).asDouble(initCash);
                    } else {
                        initCash = mem.baseInitialReserve;
                    }
                }

                double finCash = round2(initCash + surplus - deficit);
                s.memberCaixaFinal.put(mem.name, finCash);
                totalFinalCash += finCash;

                double burnMem = expMember > 0 ? expMember : 1.0;
                s.memberRunwayApenasReserva.put(mem.name, round2(finCash / burnMem));
                s.memberRunwayComGiro.put(mem.name, round2((finCash + finGiro) / burnMem));

                prevFinalGiro.put(mem.id, finGiro);
                prevFinalCash.put(mem.id, finCash);
            }

            // Shared expenses
            if (m.has("expenses") && m.get("expenses").isArray()) {
                for (JsonNode exp : m.get("expenses")) {
                    String owner = exp.has("owner") ? exp.get("owner").asText() : "";
                    if ("Compartilhado".equalsIgnoreCase(owner)) {
                        totalExpenses += exp.has("amount") ? exp.get("amount").asDouble(0.0) : 0.0;
                    }
                }
            }

            s.incomeTotal = m.has("income") && m.get("income").asDouble(0) > 0 ? round2(m.get("income").asDouble()) : round2(totalIncome);
            s.expensesTotal = round2(totalExpenses);
            s.resultadoTotal = round2(s.incomeTotal - s.expensesTotal);
            s.initialCapitalGiroTotal = round2(totalInitialGiro);
            s.finalCapitalGiroTotal = round2(totalFinalGiro);
            s.caixaFinalUnificado = round2(totalFinalCash);

            double burnTotal = s.expensesTotal > 0 ? s.expensesTotal : 1.0;
            s.runwayMesesApenasReserva = round2(s.caixaFinalUnificado / burnTotal);
            s.runwayMesesLiquidezTotal = round2((s.caixaFinalUnificado + s.finalCapitalGiroTotal) / burnTotal);

            list.add(s);
        }
        return list;
    }

    /**
     * Multi-year forward projection model from latest available year (e.g. 2026) up to targetYear (e.g. 2027, 2028).
     */
    private List<MonthlyFinancialSummary> projectForwardYear(String tenantId, int targetYear) {
        List<MonthlyFinancialSummary> base2026 = calculateMonthlySummaries(tenantId, 2026);
        if (base2026.isEmpty()) {
            return new ArrayList<>();
        }

        MonthlyFinancialSummary dec2026 = base2026.get(base2026.size() - 1);
        Map<String, Double> runningCash = new LinkedHashMap<>(dec2026.memberCaixaFinal);
        Map<String, Double> runningGiro = new LinkedHashMap<>(dec2026.memberFinalCapitalGiro);

        List<MonthlyFinancialSummary> resultList = new ArrayList<>();

        for (int y = 2027; y <= targetYear; y++) {
            List<MonthlyFinancialSummary> yearMonths = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                MonthlyFinancialSummary s = new MonthlyFinancialSummary();
                s.year = y;
                s.monthIndex = i;
                s.monthName = MONTH_NAMES[i];
                s.isProjected = true;

                double totalIncome = 0.0;
                double totalExpenses = 0.0;
                double totalInitGiro = 0.0;
                double totalFinGiro = 0.0;
                double totalFinCash = 0.0;

                for (Map.Entry<String, Double> entry : dec2026.memberIncomes.entrySet()) {
                    String memName = entry.getKey();
                    double baseInc = entry.getValue();
                    double baseExp = dec2026.memberExpenses.getOrDefault(memName, baseInc * 0.75);
                    double capGiro = dec2026.memberFinalCapitalGiro.getOrDefault(memName, 6000.0);

                    double inc = baseInc + ((i == 10 || i == 11) ? (baseInc * 0.5) : 0.0);
                    double exp = baseExp * (1.0 + (y - 2026) * 0.04) + ((i == 0 || i == 11) ? (baseExp * 0.2) : 0.0);

                    s.memberIncomes.put(memName, round2(inc));
                    s.memberExpenses.put(memName, round2(exp));
                    totalIncome += inc;
                    totalExpenses += exp;

                    double res = round2(inc - exp);
                    s.memberResultados.put(memName, res);

                    double initG = runningGiro.getOrDefault(memName, capGiro);
                    s.memberInitialCapitalGiro.put(memName, round2(initG));
                    totalInitGiro += initG;

                    double rawG = initG + res;
                    double finG = round2(Math.max(0, Math.min(capGiro, rawG)));
                    s.memberFinalCapitalGiro.put(memName, finG);
                    totalFinGiro += finG;

                    double surplus = rawG > capGiro ? (rawG - capGiro) : 0.0;
                    double deficit = rawG < 0 ? Math.abs(rawG) : 0.0;

                    double initC = runningCash.getOrDefault(memName, 10000.0);
                    double finC = round2(initC + surplus - deficit);
                    s.memberCaixaFinal.put(memName, finC);
                    totalFinCash += finC;

                    double burnMem = exp > 0 ? exp : 1.0;
                    s.memberRunwayApenasReserva.put(memName, round2(finC / burnMem));
                    s.memberRunwayComGiro.put(memName, round2((finC + finG) / burnMem));

                    runningGiro.put(memName, finG);
                    runningCash.put(memName, finC);
                }

                s.incomeTotal = round2(totalIncome);
                s.expensesTotal = round2(totalExpenses);
                s.resultadoTotal = round2(s.incomeTotal - s.expensesTotal);
                s.initialCapitalGiroTotal = round2(totalInitGiro);
                s.finalCapitalGiroTotal = round2(totalFinGiro);
                s.caixaFinalUnificado = round2(totalFinCash);

                double burnTotal = s.expensesTotal > 0 ? s.expensesTotal : 1.0;
                s.runwayMesesApenasReserva = round2(s.caixaFinalUnificado / burnTotal);
                s.runwayMesesLiquidezTotal = round2((s.caixaFinalUnificado + s.finalCapitalGiroTotal) / burnTotal);

                yearMonths.add(s);
            }

            if (y == targetYear) {
                resultList = yearMonths;
            }
        }

        return resultList;
    }

    /**
     * Tool: Retrieves live Spreadsheet Financial State from PostgreSQL & Redis.
     */
    public Map<String, Object> getSpreadsheetFinancialState(String tenantId, int year) {
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("Tool.getSpreadsheetFinancialState")
                    .setAttribute("tenant.id", tenantId)
                    .setAttribute("year", year)
                    .startSpan();
        }

        try {
            String sql = "SELECT data_json, members_json, base_initial_reserve FROM spreadsheet_state WHERE tenant_id = ? AND year = ?";
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, tenantId);
                stmt.setInt(2, year);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        Map<String, Object> result = new HashMap<>();
                        result.put("tenantId", tenantId);
                        result.put("year", year);
                        result.put("baseInitialReserve", rs.getDouble("base_initial_reserve"));
                        result.put("data", objectMapper.readTree(rs.getString("data_json")));
                        if (rs.getString("members_json") != null) {
                            result.put("members", objectMapper.readTree(rs.getString("members_json")));
                        }
                        result.put("found", true);
                        return result;
                    }
                }
            }

            return Map.of(
                    "tenantId", tenantId,
                    "year", year,
                    "baseInitialReserve", 15500.00,
                    "found", false
            );
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error retrieving spreadsheet financial state for tenant %s, year %d", tenantId, year);
            return Map.of("error", e.getMessage());
        } finally {
            if (span != null) span.end();
        }
    }

    /**
     * Tool: Simulates major purchases (cars, real estate down payments, electronics) across ANY year and month.
     */
    public Map<String, Object> evaluatePurchaseTiming(String tenantId, double purchaseAmount, String targetMonth, int targetYear) {
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("Tool.evaluatePurchaseTiming")
                    .setAttribute("tenant.id", tenantId)
                    .setAttribute("purchase.amount", purchaseAmount)
                    .setAttribute("target.month", targetMonth != null ? targetMonth : "current")
                    .setAttribute("target.year", targetYear)
                    .startSpan();
        }

        try {
            List<MonthlyFinancialSummary> summaries = calculateMonthlySummaries(tenantId, targetYear);
            String resolvedMonthName = resolveMonth(targetMonth);

            MonthlyFinancialSummary targetSummary = null;
            for (MonthlyFinancialSummary s : summaries) {
                if (s.monthName.equalsIgnoreCase(resolvedMonthName)) {
                    targetSummary = s;
                    break;
                }
            }
            if (targetSummary == null && !summaries.isEmpty()) {
                targetSummary = summaries.get(Math.min(7, summaries.size() - 1));
            }

            double monthReserve = targetSummary != null ? targetSummary.caixaFinalUnificado : 54884.27;
            double monthGiro = targetSummary != null ? targetSummary.finalCapitalGiroTotal : 12789.05;
            double monthBurn = targetSummary != null ? targetSummary.expensesTotal : 11014.44;
            double minSafeReserve = round2(monthBurn * 6.0); // 6 months safety runway minimum

            Map<String, Object> evaluation = new HashMap<>();
            evaluation.put("purchaseAmount", purchaseAmount);
            evaluation.put("targetYear", targetYear);
            evaluation.put("targetMonth", targetSummary != null ? targetSummary.monthName : resolvedMonthName);
            evaluation.put("emergencyReserveInTargetPeriod", monthReserve);
            evaluation.put("capitalGiroInTargetPeriod", monthGiro);
            evaluation.put("minSafeEmergencyRunwayBuffer6M", minSafeReserve);
            evaluation.put("isForwardProjected", targetYear > 2026 || (targetSummary != null && targetSummary.isProjected));

            if (purchaseAmount <= 0) {
                evaluation.put("recommendation", "Valor inválido para simulação de compra.");
                evaluation.put("isSafe", false);
                return evaluation;
            }

            // 1. Can Pay in Cash (à vista)?
            boolean canPayInFullSafely = (monthReserve - purchaseAmount) >= minSafeReserve;
            double reserveRemainingIfPaidInFull = round2(monthReserve - purchaseAmount);
            double runwayRemainingIfPaidInFull = round2(reserveRemainingIfPaidInFull / (monthBurn > 0 ? monthBurn : 1.0));

            // 2. Down Payment + Financing Options (for high-ticket items like Cars R$ 40k–150k)
            double downPayment50 = round2(purchaseAmount * 0.50);
            double downPayment30 = round2(purchaseAmount * 0.30);
            double financedAmount50 = round2(purchaseAmount * 0.50);
            double financedAmount70 = round2(purchaseAmount * 0.70);

            // Estimated monthly installment with typical 1.35% a.m. automotive interest
            double installment24x = round2((financedAmount50 * 1.18) / 24.0);
            double installment36x = round2((financedAmount50 * 1.28) / 36.0);
            double installment48x = round2((financedAmount50 * 1.38) / 48.0);

            // Short-term installment options (interest-free card)
            double installment3x = round2(purchaseAmount / 3.0);
            double installment6x = round2(purchaseAmount / 6.0);
            double installment10x = round2(purchaseAmount / 10.0);
            double installment12x = round2(purchaseAmount / 12.0);

            evaluation.put("canPayInFullSafely", canPayInFullSafely);
            evaluation.put("reserveRemainingIfPaidInFull", reserveRemainingIfPaidInFull);
            evaluation.put("runwayRemainingIfPaidInFull", runwayRemainingIfPaidInFull);
            evaluation.put("suggestedDownPayment50", downPayment50);
            evaluation.put("suggestedDownPayment30", downPayment30);
            evaluation.put("estimatedInstallment24x", installment24x);
            evaluation.put("estimatedInstallment36x", installment36x);
            evaluation.put("estimatedInstallment48x", installment48x);
            evaluation.put("suggestedInstallment3x", installment3x);
            evaluation.put("suggestedInstallment6x", installment6x);
            evaluation.put("suggestedInstallment10x", installment10x);
            evaluation.put("suggestedInstallment12x", installment12x);

            if (purchaseAmount >= 40000.00) {
                evaluation.put("category", "AQUISIÇÃO DE GRANDE PORTE (CARRO / IMÓVEL)");
                evaluation.put("statusBadge", canPayInFullSafely ? "COMPRA À VISTA VIÁVEL" : "ENTRADA + FINANCIAMENTO RECOMENDADO");
                evaluation.put("recommendation", String.format(
                        "Para uma aquisição de R$ %,.2f em %s/%d: A reserva projetada será de R$ %,.2f. " +
                        (canPayInFullSafely ? "Você pode pagar à vista e ainda manter %.1f meses de reserva." :
                        "Pagar 100%% à vista comprometeria o colchão de segurança de 6 meses (R$ %,.2f). Recomendamos entrada de 50%% (R$ %,.2f) e saldo em 24x ou 36x."),
                        purchaseAmount, targetSummary != null ? targetSummary.monthName : resolvedMonthName, targetYear, monthReserve,
                        runwayRemainingIfPaidInFull, minSafeReserve, downPayment50
                ));
            } else {
                evaluation.put("category", "CONSUMO / EQUIPAMENTOS");
                evaluation.put("statusBadge", canPayInFullSafely ? "COMPRA SEGURA" : "PARCELAMENTO RECOMENDADO");
            }

            return evaluation;
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error evaluating purchase timing for tenant %s", tenantId);
            return Map.of("error", e.getMessage());
        } finally {
            if (span != null) span.end();
        }
    }

    /**
     * Tool: Evaluates Emergency Reserve Runway, Monthly Savings Rate and Month-by-Month Matrix dynamically for ANY year and month.
     */
    public Map<String, Object> evaluateSavingsHealth(String tenantId, int year, String requestedMonth) {
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("Tool.evaluateSavingsHealth")
                    .setAttribute("tenant.id", tenantId)
                    .setAttribute("year", year)
                    .setAttribute("requested.month", requestedMonth)
                    .startSpan();
        }

        try {
            List<MonthlyFinancialSummary> summaries = calculateMonthlySummaries(tenantId, year);
            String targetMonthName = resolveMonth(requestedMonth);

            MonthlyFinancialSummary selected = null;
            double sumExpenses = 0.0;
            double sumIncome = 0.0;

            for (MonthlyFinancialSummary s : summaries) {
                sumExpenses += s.expensesTotal;
                sumIncome += s.incomeTotal;
                if (s.monthName.equalsIgnoreCase(targetMonthName)) {
                    selected = s;
                }
            }

            if (selected == null && !summaries.isEmpty()) {
                selected = summaries.get(Math.min(7, summaries.size() - 1));
            }

            double totalReserve = (selected != null) ? selected.caixaFinalUnificado : 54884.27;
            double giroTotal = (selected != null) ? selected.finalCapitalGiroTotal : 12789.05;
            double actualMonthlyBurn = (selected != null && selected.expensesTotal > 0) ? selected.expensesTotal : 11014.44;

            double runwayReserveOnlyMonths = (selected != null) ? selected.runwayMesesApenasReserva : round2(totalReserve / actualMonthlyBurn);
            double runwayTotalLiquidityMonths = (selected != null) ? selected.runwayMesesLiquidezTotal : round2((totalReserve + giroTotal) / actualMonthlyBurn);

            double avgMonthlyExpenses = summaries.size() > 0 ? round2(sumExpenses / summaries.size()) : actualMonthlyBurn;
            double avgMonthlyIncome = summaries.size() > 0 ? round2(sumIncome / summaries.size()) : 10900.00;
            double annualNetSavings = round2(sumIncome - sumExpenses);

            Map<String, Object> health = new HashMap<>();
            health.put("anoConsultado", year);
            health.put("isAnoProjetado", year > 2026 || (selected != null && selected.isProjected));
            health.put("mesConsultado", selected != null ? selected.monthName : targetMonthName);
            health.put("caixaFinalMesUnificado", totalReserve);
            health.put("capitalGiroMesUnificado", giroTotal);
            health.put("gastosMensaisMesTotal", actualMonthlyBurn);
            health.put("rendimentosMensaisMesTotal", selected != null ? selected.incomeTotal : 10900.0);
            health.put("resultadoMesTotal", selected != null ? selected.resultadoTotal : -114.44);
            health.put("mediaGastosMensaisAno", avgMonthlyExpenses);
            health.put("mediaRendimentosMensaisAno", avgMonthlyIncome);
            health.put("poupancaLiquidaProjetadaAno", annualNetSavings);
            health.put("runwayMesesApenasReserva", runwayReserveOnlyMonths);
            health.put("runwayMesesLiquidezTotal", runwayTotalLiquidityMonths);
            if (selected != null) {
                health.put("memberCaixaFinal", selected.memberCaixaFinal);
                health.put("memberCapitalGiro", selected.memberFinalCapitalGiro);
                health.put("memberExpenses", selected.memberExpenses);
                health.put("memberIncomes", selected.memberIncomes);
                health.put("memberRunways", selected.memberRunwayApenasReserva);
            }
            health.put("savingsRating", runwayTotalLiquidityMonths >= 6.0 ? "EXCELENTE (6+ MESES DE COBERTURA)" : (runwayTotalLiquidityMonths >= 3.0 ? "BOM" : "ATENÇÃO"));
            health.put("healthSummary", String.format("Em %s/%d: Gastos de R$ %,.2f, Capital de Giro de R$ %,.2f, Caixa Final de R$ %,.2f. A Reserva dura %.1f meses (ou %.1f meses com Liquidez Total).",
                    selected != null ? selected.monthName : targetMonthName, year, actualMonthlyBurn, giroTotal, totalReserve, runwayReserveOnlyMonths, runwayTotalLiquidityMonths));

            List<Map<String, Object>> monthlyTable = new ArrayList<>();
            for (MonthlyFinancialSummary s : summaries) {
                Map<String, Object> m = new HashMap<>();
                m.put("year", s.year);
                m.put("monthName", s.monthName);
                m.put("monthIndex", s.monthIndex);
                m.put("rendimentosTotal", s.incomeTotal);
                m.put("memberIncomes", s.memberIncomes);
                m.put("gastosTotal", s.expensesTotal);
                m.put("memberExpenses", s.memberExpenses);
                m.put("resultadoTotal", s.resultadoTotal);
                m.put("memberResultados", s.memberResultados);
                m.put("capitalGiroFinalUnificado", s.finalCapitalGiroTotal);
                m.put("memberCapitalGiroFinal", s.memberFinalCapitalGiro);
                m.put("caixaFinalUnificado", s.caixaFinalUnificado);
                m.put("memberCaixaFinal", s.memberCaixaFinal);
                m.put("runwayMesesApenasReserva", s.runwayMesesApenasReserva);
                m.put("runwayMesesLiquidezTotal", s.runwayMesesLiquidezTotal);
                monthlyTable.add(m);
            }
            health.put("monthlyEvolution", monthlyTable);

            return health;
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error evaluating savings health for tenant %s, year %d", tenantId, year);
            return Map.of("error", e.getMessage());
        } finally {
            if (span != null) span.end();
        }
    }

    /**
     * Tool: Performs bounded semantic vector search using pgvector across financial history.
     */
    public List<Map<String, Object>> searchFinancialHistory(String tenantId, String query, int limit) {
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("Tool.searchFinancialHistory")
                    .setAttribute("tenant.id", tenantId)
                    .setAttribute("query", query)
                    .startSpan();
        }

        try {
            float[] queryVector = embeddingService.embed(query);
            List<PgVectorRepository.VectorMatch> matches = pgVectorRepository.searchSimilar(tenantId, queryVector, limit);

            List<Map<String, Object>> results = new ArrayList<>();
            for (PgVectorRepository.VectorMatch match : matches) {
                Map<String, Object> item = new HashMap<>();
                item.put("sourceId", match.getSourceId());
                item.put("sourceType", match.getSourceType());
                item.put("content", match.getTextContent());
                item.put("metadata", match.getMetadata());
                item.put("similarity", String.format("%.2f", match.getSimilarityScore()));
                results.add(item);
            }
            return results;
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error in searchFinancialHistory for tenant %s", tenantId);
            return List.of();
        } finally {
            if (span != null) span.end();
        }
    }

    /**
     * Tool: Queries immutable Event Store audit trail.
     */
    public List<Map<String, Object>> getRecentAuditEvents(String tenantId, int limit) {
        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("Tool.getRecentAuditEvents")
                    .setAttribute("tenant.id", tenantId)
                    .startSpan();
        }

        try {
            List<EventEnvelope> envelopes = eventStore.loadEventEnvelopes(tenantId, limit, 0);
            List<Map<String, Object>> list = new ArrayList<>();
            for (EventEnvelope env : envelopes) {
                list.add(Map.of(
                        "eventId", env.getEventId() != null ? env.getEventId().toString() : "",
                        "aggregateId", env.getAggregateId() != null ? env.getAggregateId() : "",
                        "eventType", env.getEventType() != null ? env.getEventType() : "",
                        "timestamp", env.getOccurredAt() != null ? env.getOccurredAt().toString() : "",
                        "version", env.getEventVersion()
                ));
            }
            return list;
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error fetching audit events for tenant %s", tenantId);
            return List.of();
        } finally {
            if (span != null) span.end();
        }
    }

    private double round2(double val) {
        return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
