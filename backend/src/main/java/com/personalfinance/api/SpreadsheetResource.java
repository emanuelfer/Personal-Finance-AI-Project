package com.personalfinance.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personalfinance.domain.aggregate.SpreadsheetAggregate;
import com.personalfinance.infrastructure.eventstore.EventStore;
import com.personalfinance.infrastructure.redis.RedisMaterializedViewRepository;
import io.agroal.api.AgroalDataSource;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/api/spreadsheet")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class SpreadsheetResource {

    private static final Logger LOG = Logger.getLogger(SpreadsheetResource.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    EventStore eventStore;

    @Inject
    RedisMaterializedViewRepository redisRepository;

    @Inject
    ObjectMapper objectMapper;

    private void ensureTableExists(Connection conn) throws SQLException {
        String ddl = """
            CREATE TABLE IF NOT EXISTS spreadsheet_state (
                tenant_id VARCHAR(64) NOT NULL,
                year INT NOT NULL,
                data_json JSONB NOT NULL,
                members_json JSONB DEFAULT '[]',
                base_initial_reserve NUMERIC(15, 2) NOT NULL DEFAULT 15500.00,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (tenant_id, year)
            );
            ALTER TABLE spreadsheet_state ADD COLUMN IF NOT EXISTS members_json JSONB DEFAULT '[]';
            ALTER TABLE spreadsheet_state ADD COLUMN IF NOT EXISTS base_initial_reserve NUMERIC(15, 2) DEFAULT 15500.00;
        """;
        try (PreparedStatement stmt = conn.prepareStatement(ddl)) {
            stmt.execute();
        }
    }

    @GET
    @Path("/{year}")
    @RunOnVirtualThread
    public Response getSpreadsheetState(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @PathParam("year") int year) {

        // ⚡ 1. Fast Path: Check Redis Distributed Cache (< 0.3ms latency)
        try {
            String cachedState = redisRepository.getSpreadsheetState(tenantId, year);
            if (cachedState != null && !cachedState.isBlank()) {
                LOG.debugf("Serving spreadsheet for tenant %s, year %d from Redis cache", tenantId, year);
                JsonNode cachedNode = objectMapper.readTree(cachedState);
                if (cachedNode instanceof com.fasterxml.jackson.databind.node.ObjectNode objNode) {
                    if (!objNode.has("members") || objNode.get("members").isEmpty()) {
                        List<Map<String, Object>> defaultMembers = List.of(
                            Map.of(
                                "id", "member-1",
                                "name", "Membro 1",
                                "icon", "👤",
                                "color", "indigo",
                                "baseInitialReserve", 10000.0,
                                "baseInitialCapitalGiro", 6000.0
                            )
                        );
                        objNode.set("members", objectMapper.valueToTree(defaultMembers));
                    }
                    return Response.ok(objNode).build();
                }
                return Response.ok(cachedNode).build();
            }
        } catch (Exception e) {
            LOG.warnf("Redis cache lookup failed for tenant %s, year %d: %s", tenantId, year, e.getMessage());
        }

        // 🐘 2. Fallback Path: Query PostgreSQL Materialized View
        String sql = "SELECT data_json, members_json, base_initial_reserve, updated_at FROM spreadsheet_state WHERE tenant_id = ? AND year = ?";
        
        try (Connection conn = dataSource.getConnection()) {
            ensureTableExists(conn);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, tenantId);
                stmt.setInt(2, year);

                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String dataJson = rs.getString("data_json");
                        String membersJson = rs.getString("members_json");
                        BigDecimal baseReserve = rs.getBigDecimal("base_initial_reserve");
                        String updatedAt = rs.getString("updated_at");

                        JsonNode membersNode = null;
                        if (membersJson != null && !membersJson.isBlank() && !membersJson.trim().equals("[]")) {
                            try {
                                membersNode = objectMapper.readTree(membersJson);
                            } catch (Exception ignored) {}
                        }

                        // Seamless fallback: If members list is empty, initialize generic default member
                        if (membersNode == null || !membersNode.isArray() || membersNode.size() == 0) {
                            List<Map<String, Object>> defaultMembers = List.of(
                                Map.of(
                                    "id", "member-1",
                                    "name", "Membro 1",
                                    "icon", "👤",
                                    "color", "indigo",
                                    "baseInitialReserve", 10000.00,
                                    "baseInitialCapitalGiro", 6000.00
                                )
                            );
                            membersNode = objectMapper.valueToTree(defaultMembers);
                        }

                        Map<String, Object> response = new HashMap<>();
                        response.put("tenantId", tenantId);
                        response.put("year", year);
                        response.put("baseInitialReserve", baseReserve != null ? baseReserve.doubleValue() : 15500.00);
                        response.put("updatedAt", updatedAt);
                        response.put("data", objectMapper.readTree(dataJson));
                        response.put("members", membersNode);
                        response.put("found", true);

                        // Warm Redis Cache
                        try {
                            redisRepository.saveSpreadsheetState(tenantId, year, objectMapper.writeValueAsString(response));
                        } catch (Exception ex) {
                            LOG.warnf("Failed to warm Redis cache for tenant %s, year %d", tenantId, year);
                        }

                        return Response.ok(response).build();
                    } else {
                        Map<String, Object> empty = new HashMap<>();
                        empty.put("tenantId", tenantId);
                        empty.put("year", year);
                        empty.put("found", false);
                        return Response.ok(empty).build();
                    }
                }
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error loading spreadsheet state for tenant %s, year %d", tenantId, year);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/{year}")
    @RunOnVirtualThread
    public Response saveSpreadsheetState(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @PathParam("year") int year,
            Map<String, Object> payload) {
        
        try {
            Object dataObj = payload.get("data");
            Object membersObj = payload.get("members");
            Object reserveObj = payload.get("baseInitialReserve");

            double baseReserve = reserveObj instanceof Number ? ((Number) reserveObj).doubleValue() : 15500.00;
            
            String dataJson = objectMapper.writeValueAsString(dataObj != null ? dataObj : payload);
            String membersJson = membersObj != null ? objectMapper.writeValueAsString(membersObj) : "[]";

            // 🎯 CQRS & Event Sourcing Command Handling
            String aggregateId = "spreadsheet-" + year;
            long currentVersion = eventStore.loadEvents(tenantId, aggregateId).size();

            SpreadsheetAggregate aggregate = SpreadsheetAggregate.createOrUpdate(
                    tenantId,
                    year,
                    dataJson,
                    membersJson,
                    BigDecimal.valueOf(baseReserve),
                    currentVersion
            );

            // 📜 Append immutable event to Event Store (triggers Kafka streaming & projections)
            eventStore.appendEvents(tenantId, "SPREADSHEET", aggregateId, aggregate.getUncommittedEvents(), currentVersion);
            aggregate.markChangesAsCommitted();

            LOG.infof("Event-sourced spreadsheet save successful for tenant %s, year %d (v%d)", tenantId, year, currentVersion + 1);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "EVENT_SOURCED_PERSISTED");
            response.put("tenantId", tenantId);
            response.put("year", year);
            response.put("version", currentVersion + 1);
            response.put("baseInitialReserve", baseReserve);
            response.put("members", objectMapper.readTree(membersJson));
            response.put("savedAt", System.currentTimeMillis());

            return Response.ok(response).build();
        } catch (Exception e) {
            LOG.errorf(e, "Error saving spreadsheet event for tenant %s, year %d", tenantId, year);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }
}
