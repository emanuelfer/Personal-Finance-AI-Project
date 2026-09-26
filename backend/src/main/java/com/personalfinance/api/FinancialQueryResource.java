package com.personalfinance.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.personalfinance.infrastructure.redis.RedisMaterializedViewRepository;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
public class FinancialQueryResource {

    private static final Logger LOG = Logger.getLogger(FinancialQueryResource.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    RedisMaterializedViewRepository redisRepository;

    @Inject
    Tracer tracer;

    private final ObjectMapper mapper = new ObjectMapper();

    @GET
    @Path("/accounts")
    @RunOnVirtualThread
    public Response getAccounts(@HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId) {
        Span span = tracer.spanBuilder("Query.getAccounts").startSpan();
        try {
            Set<String> accountIds = redisRepository.getAccountIds(tenantId);
            List<Map<String, Object>> accounts = new ArrayList<>();
            if (accountIds != null && !accountIds.isEmpty()) {
                for (String id : accountIds) {
                    Map<String, String> redisData = redisRepository.getAccount(tenantId, id);
                    if (!redisData.isEmpty()) {
                        accounts.add(new HashMap<>(redisData));
                    }
                }
            }
            return Response.ok(accounts).build();
        } catch (Exception e) {
            span.recordException(e);
            return Response.ok(List.of()).build();
        } finally {
            span.end();
        }
    }

    @GET
    @Path("/transactions")
    @RunOnVirtualThread
    public Response getTransactions(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        return Response.ok(List.of()).build();
    }

    @GET
    @Path("/metrics/monthly")
    @RunOnVirtualThread
    public Response getMonthlyMetrics(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @QueryParam("month") String month) {
        String targetMonth = (month != null && !month.isBlank()) ? month : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        Map<String, String> redisMetrics = redisRepository.getMonthlyMetrics(tenantId, targetMonth);
        if (!redisMetrics.isEmpty()) {
            return Response.ok(redisMetrics).build();
        }
        return Response.ok(Map.of("yearMonth", targetMonth, "total_income", 0.0, "total_expense", 0.0, "categories", Map.of())).build();
    }

    @GET
    @Path("/receipts")
    @RunOnVirtualThread
    public Response getReceipts(@HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId) {
        return Response.ok(List.of()).build();
    }

    @GET
    @Path("/budgets")
    @RunOnVirtualThread
    public Response getBudgets(@HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId) {
        return Response.ok(List.of()).build();
    }
}
