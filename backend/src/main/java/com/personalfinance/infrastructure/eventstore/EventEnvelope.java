package com.personalfinance.infrastructure.eventstore;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

public class EventEnvelope {

    @JsonProperty("eventId")
    private UUID eventId;

    @JsonProperty("tenantId")
    private String tenantId;

    @JsonProperty("aggregateType")
    private String aggregateType;

    @JsonProperty("aggregateId")
    private String aggregateId;

    @JsonProperty("eventType")
    private String eventType;

    @JsonProperty("eventVersion")
    private long eventVersion;

    @JsonProperty("payloadJson")
    private String payloadJson;

    @JsonProperty("metadataJson")
    private String metadataJson;

    @JsonProperty("occurredAt")
    private Instant occurredAt;

    public EventEnvelope() {
    }

    public EventEnvelope(UUID eventId, String tenantId, String aggregateType, String aggregateId,
                         String eventType, long eventVersion, String payloadJson, String metadataJson,
                         Instant occurredAt) {
        this.eventId = eventId;
        this.tenantId = tenantId;
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.eventVersion = eventVersion;
        this.payloadJson = payloadJson;
        this.metadataJson = metadataJson;
        this.occurredAt = occurredAt;
    }

    public UUID getEventId() {
        return eventId;
    }

    public void setEventId(UUID eventId) {
        this.eventId = eventId;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getAggregateType() {
        return aggregateType;
    }

    public void setAggregateType(String aggregateType) {
        this.aggregateType = aggregateType;
    }

    public String getAggregateId() {
        return aggregateId;
    }

    public void setAggregateId(String aggregateId) {
        this.aggregateId = aggregateId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public long getEventVersion() {
        return eventVersion;
    }

    public void setEventVersion(long eventVersion) {
        this.eventVersion = eventVersion;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }
}
