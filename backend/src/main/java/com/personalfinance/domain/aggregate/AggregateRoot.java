package com.personalfinance.domain.aggregate;

import com.personalfinance.domain.event.DomainEvent;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class AggregateRoot {

    protected String id;
    protected String tenantId;
    protected long version = 0;
    private final List<DomainEvent> uncommittedEvents = new ArrayList<>();

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public long getVersion() {
        return version;
    }

    public List<DomainEvent> getUncommittedEvents() {
        return Collections.unmodifiableList(uncommittedEvents);
    }

    public void markChangesAsCommitted() {
        this.uncommittedEvents.clear();
    }

    public void loadFromHistory(List<DomainEvent> history) {
        for (DomainEvent event : history) {
            applyChange(event, false);
            this.version = event.getVersion();
        }
    }

    protected void applyChange(DomainEvent event) {
        applyChange(event, true);
    }

    private void applyChange(DomainEvent event, boolean isNew) {
        handle(event);
        if (isNew) {
            this.version++;
            uncommittedEvents.add(event);
        }
    }

    protected abstract void handle(DomainEvent event);
}
