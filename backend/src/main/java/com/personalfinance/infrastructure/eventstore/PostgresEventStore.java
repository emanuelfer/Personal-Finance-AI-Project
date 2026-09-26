package com.personalfinance.infrastructure.eventstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.personalfinance.domain.event.AccountCreatedEvent;
import com.personalfinance.domain.event.BaseEvent;
import com.personalfinance.domain.event.BudgetCreatedEvent;
import com.personalfinance.domain.event.BudgetExceededEvent;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.ReceiptIngestedEvent;
import com.personalfinance.domain.event.ReceiptProcessedEvent;
import com.personalfinance.domain.event.ReceiptReconciledEvent;
import com.personalfinance.domain.event.SpreadsheetUpdatedEvent;
import com.personalfinance.domain.event.TransactionRecordedEvent;
import com.personalfinance.infrastructure.outbox.EventPublisher;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class PostgresEventStore implements EventStore {

    private static final Logger LOG = Logger.getLogger(PostgresEventStore.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    EventPublisher eventPublisher;

    @Inject
    Tracer tracer;

    private ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void appendEvents(String tenantId, String aggregateType, String aggregateId, List<DomainEvent> events, long expectedVersion) {
        if (events == null || events.isEmpty()) {
            return;
        }

        Span span = tracer.spanBuilder("EventStore.appendEvents")
                .setAttribute("tenant.id", tenantId)
                .setAttribute("aggregate.type", aggregateType)
                .setAttribute("aggregate.id", aggregateId)
                .setAttribute("events.count", events.size())
                .startSpan();

        String checkVersionSql = "SELECT COALESCE(MAX(event_version), 0) AS current_version FROM event_store WHERE tenant_id = ? AND aggregate_id = ?";
        String insertSql = "INSERT INTO event_store (event_id, tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload_json, metadata_json, occurred_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?)";

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);

            try {
                // Verify optimistic concurrency
                try (PreparedStatement stmt = conn.prepareStatement(checkVersionSql)) {
                    stmt.setString(1, tenantId);
                    stmt.setString(2, aggregateId);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (rs.next()) {
                            long currentVersion = rs.getLong("current_version");
                            if (currentVersion != expectedVersion) {
                                throw new OptimisticConcurrencyException(
                                        String.format("Optimistic locking conflict on aggregate %s: expected version %d, but found %d",
                                                aggregateId, expectedVersion, currentVersion)
                                );
                            }
                        }
                    }
                }

                // Insert new events in sequence
                long nextVersion = expectedVersion;
                try (PreparedStatement stmt = conn.prepareStatement(insertSql)) {
                    for (DomainEvent event : events) {
                        nextVersion++;
                        UUID eventId = event.getEventId() != null ? event.getEventId() : UUID.randomUUID();
                        String payloadJson = objectMapper.writeValueAsString(event);
                        String metadataJson = objectMapper.writeValueAsString(event.getMetadata());

                        stmt.setObject(1, eventId);
                        stmt.setString(2, tenantId);
                        stmt.setString(3, aggregateType);
                        stmt.setString(4, aggregateId);
                        stmt.setString(5, event.getEventType());
                        stmt.setLong(6, nextVersion);
                        stmt.setString(7, payloadJson);
                        stmt.setString(8, metadataJson);
                        stmt.setTimestamp(9, Timestamp.from(event.getOccurredAt() != null ? event.getOccurredAt() : Instant.now()));
                        stmt.addBatch();
                    }
                    stmt.executeBatch();
                }

                conn.commit();
                LOG.infof("Committed %d event(s) for aggregate %s (tenant %s, version %d)", events.size(), aggregateId, tenantId, nextVersion);

                // Publish to Redpanda / Kafka outbox
                for (DomainEvent event : events) {
                    eventPublisher.publish(event);
                }

            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (SQLException e) {
            span.recordException(e);
            throw new RuntimeException("Database error in EventStore.appendEvents", e);
        } catch (Exception e) {
            span.recordException(e);
            if (e instanceof RuntimeException re) {
                throw re;
            }
            throw new RuntimeException(e);
        } finally {
            span.end();
        }
    }

    @Override
    public List<DomainEvent> loadEvents(String tenantId, String aggregateId) {
        Span span = tracer.spanBuilder("EventStore.loadEvents")
                .setAttribute("tenant.id", tenantId)
                .setAttribute("aggregate.id", aggregateId)
                .startSpan();

        String selectSql = "SELECT event_id, tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload_json, metadata_json, occurred_at " +
                "FROM event_store WHERE tenant_id = ? AND aggregate_id = ? ORDER BY event_version ASC";

        List<DomainEvent> events = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(selectSql)) {

            stmt.setString(1, tenantId);
            stmt.setString(2, aggregateId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String eventType = rs.getString("event_type");
                    String payloadJson = rs.getString("payload_json");
                    DomainEvent event = deserializeEvent(eventType, payloadJson);
                    if (event != null) {
                        events.add(event);
                    }
                }
            }
            return events;
        } catch (SQLException e) {
            span.recordException(e);
            throw new RuntimeException("Database error in EventStore.loadEvents", e);
        } finally {
            span.end();
        }
    }

    @Override
    public List<EventEnvelope> loadEventEnvelopes(String tenantId, int limit, int offset) {
        String selectSql = "SELECT event_id, tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload_json, metadata_json, occurred_at " +
                "FROM event_store WHERE tenant_id = ? ORDER BY occurred_at DESC, event_version DESC LIMIT ? OFFSET ?";

        List<EventEnvelope> envelopes = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(selectSql)) {

            stmt.setString(1, tenantId);
            stmt.setInt(2, Math.max(1, Math.min(limit, 500)));
            stmt.setInt(3, Math.max(0, offset));

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    EventEnvelope envelope = new EventEnvelope(
                            (UUID) rs.getObject("event_id"),
                            rs.getString("tenant_id"),
                            rs.getString("aggregate_type"),
                            rs.getString("aggregate_id"),
                            rs.getString("event_type"),
                            rs.getLong("event_version"),
                            rs.getString("payload_json"),
                            rs.getString("metadata_json"),
                            rs.getTimestamp("occurred_at").toInstant()
                    );
                    envelopes.add(envelope);
                }
            }
            return envelopes;
        } catch (SQLException e) {
            throw new RuntimeException("Database error in loadEventEnvelopes", e);
        }
    }

    @Override
    public long countEvents(String tenantId) {
        String sql = "SELECT COUNT(*) FROM event_store WHERE tenant_id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, tenantId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
            return 0;
        } catch (SQLException e) {
            throw new RuntimeException("Database error in countEvents", e);
        }
    }

    private DomainEvent deserializeEvent(String eventType, String payloadJson) {
        try {
            Class<? extends DomainEvent> clazz = switch (eventType) {
                case "SPREADSHEET_UPDATED" -> SpreadsheetUpdatedEvent.class;
                case "ACCOUNT_CREATED" -> AccountCreatedEvent.class;
                case "TRANSACTION_RECORDED" -> TransactionRecordedEvent.class;
                case "RECEIPT_INGESTED" -> ReceiptIngestedEvent.class;
                case "RECEIPT_PROCESSED" -> ReceiptProcessedEvent.class;
                case "RECEIPT_RECONCILED" -> ReceiptReconciledEvent.class;
                case "BUDGET_CREATED" -> BudgetCreatedEvent.class;
                case "BUDGET_EXCEEDED" -> BudgetExceededEvent.class;
                default -> null;
            };

            if (clazz == null) {
                LOG.warnf("Unknown domain event type: %s", eventType);
                return null;
            }
            return objectMapper.readValue(payloadJson, clazz);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to deserialize event of type %s", eventType);
            return null;
        }
    }
}
