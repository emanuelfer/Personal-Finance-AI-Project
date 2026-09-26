package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class BaseEvent implements DomainEvent {

    @JsonProperty("eventId")
    protected UUID eventId;

    @JsonProperty("tenantId")
    protected String tenantId;

    @JsonProperty("aggregateId")
    protected String aggregateId;

    @JsonProperty("aggregateType")
    protected String aggregateType;

    @JsonProperty("eventType")
    protected String eventType;

    @JsonProperty("version")
    protected long version;

    @JsonProperty("occurredAt")
    protected Instant occurredAt;

    @JsonProperty("metadata")
    protected Map<String, Object> metadata;

    public BaseEvent() {
        this.eventId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.metadata = new HashMap<>();
    }

    public BaseEvent(String tenantId, String aggregateId, String aggregateType, String eventType, long version) {
        this.eventId = UUID.randomUUID();
        this.tenantId = tenantId;
        this.aggregateId = aggregateId;
        this.aggregateType = aggregateType;
        this.eventType = eventType;
        this.version = version;
        this.occurredAt = Instant.now();
        this.metadata = new HashMap<>();
    }

    @Override
    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    @Override
    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    @Override
    public String getAggregateId() {
        return aggregateId;
    }

    public void setAggregateId(String aggregateId) {
        this.aggregateId = aggregateId;
    }

    @Override
    public String getAggregateType() {
        return aggregateType;
    }

    public void setAggregateType(String aggregateType) {
        this.aggregateType = aggregateType;
    }

    @Override
    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    @Override
    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    @Override
    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    @Override
    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}
