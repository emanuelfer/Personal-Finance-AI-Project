package com.personalfinance.infrastructure.eventstore;

import com.personalfinance.domain.event.DomainEvent;

import java.util.List;

public interface EventStore {
    /**
     * Appends events to the event stream with optimistic concurrency checks.
     *
     * @param tenantId        the tenant ID
     * @param aggregateType   the aggregate type (e.g. ACCOUNT, RECEIPT, BUDGET)
     * @param aggregateId     the aggregate ID
     * @param events          the list of uncommitted events to append
     * @param expectedVersion the expected current version before appending
     */
    void appendEvents(String tenantId, String aggregateType, String aggregateId, List<DomainEvent> events, long expectedVersion);

    /**
     * Loads all events for a specific aggregate instance.
     */
    List<DomainEvent> loadEvents(String tenantId, String aggregateId);

    /**
     * Retrieves all events in the event store for a tenant (for audit log / event stream visualization).
     */
    List<EventEnvelope> loadEventEnvelopes(String tenantId, int limit, int offset);

    /**
     * Gets the total count of events for a tenant.
     */
    long countEvents(String tenantId);
}
