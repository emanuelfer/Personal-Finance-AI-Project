package com.personalfinance.domain.event;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public interface DomainEvent {
    UUID getEventId();
    String getTenantId();
    String getAggregateId();
    String getAggregateType();
    String getEventType();
    long getVersion();
    Instant getOccurredAt();
    Map<String, Object> getMetadata();
}
