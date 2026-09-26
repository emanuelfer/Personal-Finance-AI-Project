package com.personalfinance.infrastructure.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.personalfinance.domain.event.AccountCreatedEvent;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.SpreadsheetUpdatedEvent;
import com.personalfinance.domain.event.TransactionRecordedEvent;
import com.personalfinance.projection.SpreadsheetProjectionService;
import com.personalfinance.projection.TransactionProjectionService;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.reactive.messaging.kafka.Record;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

@ApplicationScoped
public class EventPublisher {

    private static final Logger LOG = Logger.getLogger(EventPublisher.class);

    @Inject
    @Channel("spreadsheet-events-out")
    Emitter<Record<String, String>> spreadsheetEmitter;

    @Inject
    @Channel("transaction-events-out")
    Emitter<Record<String, String>> transactionEmitter;

    @Inject
    @Channel("alert-events-out")
    Emitter<Record<String, String>> alertEmitter;

    @Inject
    SpreadsheetProjectionService spreadsheetProjectionService;

    @Inject
    TransactionProjectionService transactionProjectionService;

    @Inject
    Tracer tracer;

    private ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public void publish(DomainEvent event) {
        Span span = tracer.spanBuilder("EventPublisher.publish")
                .setAttribute("event.type", event.getEventType())
                .setAttribute("tenant.id", event.getTenantId())
                .setAttribute("aggregate.id", event.getAggregateId())
                .startSpan();

        try {
            String jsonPayload = objectMapper.writeValueAsString(event);
            
            // 🎯 Enforce Partition Affinity: Key = Tenant ID / User ID ensuring strict FIFO in-order delivery
            String partitionKey = event.getTenantId() != null ? event.getTenantId() : event.getAggregateId();
            Record<String, String> kafkaRecord = Record.of(partitionKey, jsonPayload);

            // 1. Publish asynchronously to Redpanda / Kafka channels with Partition Key
            if (event instanceof SpreadsheetUpdatedEvent spreadsheetEvent) {
                if (spreadsheetEmitter.hasRequests()) {
                    spreadsheetEmitter.send(kafkaRecord);
                }
                // Synchronous Read-Your-Own-Writes projection
                spreadsheetProjectionService.projectSpreadsheet(spreadsheetEvent);
            } else if (event instanceof TransactionRecordedEvent || event instanceof AccountCreatedEvent) {
                if (transactionEmitter.hasRequests()) {
                    transactionEmitter.send(kafkaRecord);
                }
                if (event instanceof AccountCreatedEvent accEvent) {
                    transactionProjectionService.projectAccountCreated(accEvent);
                } else if (event instanceof TransactionRecordedEvent txEvent) {
                    transactionProjectionService.projectTransaction(txEvent);
                }
            } else {
                if (alertEmitter.hasRequests()) {
                    alertEmitter.send(kafkaRecord);
                }
            }

            LOG.debugf("Published domain event %s for aggregate %s to Kafka", event.getEventType(), event.getAggregateId());
        } catch (Exception e) {
            span.recordException(e);
            LOG.errorf(e, "Failed to publish event %s", event.getEventType());
        } finally {
            span.end();
        }
    }
}
