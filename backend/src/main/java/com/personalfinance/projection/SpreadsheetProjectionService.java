package com.personalfinance.projection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personalfinance.domain.event.SpreadsheetUpdatedEvent;
import com.personalfinance.infrastructure.redis.RedisMaterializedViewRepository;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class SpreadsheetProjectionService {

    private static final Logger LOG = Logger.getLogger(SpreadsheetProjectionService.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    RedisMaterializedViewRepository redisRepository;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    Tracer tracer;

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

    @Incoming("spreadsheet-events-in")
    @RunOnVirtualThread
    public void consumeSpreadsheetEvent(String messagePayload) {
        try {
            JsonNode node = objectMapper.readTree(messagePayload);
            String eventType = node.has("eventType") ? node.get("eventType").asText() : "";
            if ("SPREADSHEET_UPDATED".equalsIgnoreCase(eventType)) {
                SpreadsheetUpdatedEvent event = objectMapper.treeToValue(node, SpreadsheetUpdatedEvent.class);
                projectSpreadsheet(event);
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error processing incoming Kafka spreadsheet event: %s", messagePayload);
        }
    }

    public void projectSpreadsheet(SpreadsheetUpdatedEvent event) {
        Span span = tracer.spanBuilder("SpreadsheetProjectionService.projectSpreadsheet")
                .setAttribute("tenant.id", event.getTenantId())
                .setAttribute("spreadsheet.year", event.getYear())
                .startSpan();

        try {
            // 1. Materialize in PostgreSQL
            String sql = """
                INSERT INTO spreadsheet_state (tenant_id, year, data_json, members_json, base_initial_reserve, updated_at)
                VALUES (?, ?, ?::jsonb, ?::jsonb, ?, NOW())
                ON CONFLICT (tenant_id, year)
                DO UPDATE SET
                    data_json = EXCLUDED.data_json,
                    members_json = EXCLUDED.members_json,
                    base_initial_reserve = EXCLUDED.base_initial_reserve,
                    updated_at = NOW();
            """;

            try (Connection conn = dataSource.getConnection()) {
                ensureTableExists(conn);
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, event.getTenantId());
                    stmt.setInt(2, event.getYear());
                    stmt.setString(3, event.getDataJson());
                    stmt.setString(4, event.getMembersJson() != null ? event.getMembersJson() : "[]");
                    stmt.setBigDecimal(5, event.getBaseInitialReserve());
                    stmt.executeUpdate();
                }
            }

            // 2. Materialize in Redis Distributed Cache for < 0.3ms Instant Reads
            Map<String, Object> cacheMap = new HashMap<>();
            cacheMap.put("tenantId", event.getTenantId());
            cacheMap.put("year", event.getYear());
            cacheMap.put("baseInitialReserve", event.getBaseInitialReserve());
            cacheMap.put("updatedAt", String.valueOf(System.currentTimeMillis()));
            cacheMap.put("data", objectMapper.readTree(event.getDataJson()));
            cacheMap.put("members", objectMapper.readTree(event.getMembersJson() != null ? event.getMembersJson() : "[]"));
            cacheMap.put("found", true);

            String cacheJson = objectMapper.writeValueAsString(cacheMap);
            redisRepository.saveSpreadsheetState(event.getTenantId(), event.getYear(), cacheJson);

            LOG.infof("Projected spreadsheet state into PostgreSQL & Redis for tenant %s, year %d", event.getTenantId(), event.getYear());
        } catch (Exception e) {
            span.recordException(e);
            LOG.errorf(e, "Error projecting spreadsheet state for tenant %s, year %d", event.getTenantId(), event.getYear());
        } finally {
            span.end();
        }
    }
}
