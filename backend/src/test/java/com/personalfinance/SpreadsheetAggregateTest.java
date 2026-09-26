package com.personalfinance;

import com.personalfinance.domain.aggregate.SpreadsheetAggregate;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.SpreadsheetUpdatedEvent;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class SpreadsheetAggregateTest {

    @Test
    void testSpreadsheetAggregateGeneratesEventAndIncrementsVersion() {
        String dataJson = "{\"months\": [{\"month\": \"Janeiro\", \"year\": 2026}]}";
        String membersJson = "[{\"id\":\"member-1\",\"name\":\"Membro 1\"}]";
        SpreadsheetAggregate aggregate = SpreadsheetAggregate.createOrUpdate(
                "tenant-alpha",
                2026,
                dataJson,
                membersJson,
                BigDecimal.valueOf(15500.00),
                0
        );

        assertEquals("spreadsheet-2026", aggregate.getId());
        assertEquals("tenant-alpha", aggregate.getTenantId());
        assertEquals(1, aggregate.getVersion());
        assertEquals(membersJson, aggregate.getMembersJson());

        List<DomainEvent> events = aggregate.getUncommittedEvents();
        assertEquals(1, events.size());
        assertTrue(events.get(0) instanceof SpreadsheetUpdatedEvent);

        SpreadsheetUpdatedEvent event = (SpreadsheetUpdatedEvent) events.get(0);
        assertEquals(2026, event.getYear());
        assertEquals(dataJson, event.getDataJson());
        assertEquals(membersJson, event.getMembersJson());
        assertEquals(BigDecimal.valueOf(15500.00), event.getBaseInitialReserve());
    }

    @Test
    void testSpreadsheetAggregateRehydrationFromHistory() {
        String dataJson = "{\"months\": []}";
        String membersJson = "[{\"id\":\"user-1\",\"name\":\"User 1\"}]";
        SpreadsheetUpdatedEvent event = new SpreadsheetUpdatedEvent(
                "tenant-alpha",
                2026,
                1,
                dataJson,
                membersJson,
                BigDecimal.valueOf(16000.00)
        );

        SpreadsheetAggregate aggregate = new SpreadsheetAggregate();
        aggregate.loadFromHistory(List.of(event));

        assertEquals("spreadsheet-2026", aggregate.getId());
        assertEquals("tenant-alpha", aggregate.getTenantId());
        assertEquals(1, aggregate.getVersion());
        assertEquals(BigDecimal.valueOf(16000.00), aggregate.getBaseInitialReserve());
        assertEquals(membersJson, aggregate.getMembersJson());
        assertEquals(0, aggregate.getUncommittedEvents().size());
    }

    @Test
    void testSpreadsheetAggregateWithDynamicMembers() {
        String dataJson = "{\"months\": []}";
        String membersJson = "[{\"id\":\"member-1\",\"name\":\"Alice\"},{\"id\":\"member-2\",\"name\":\"Bob\"},{\"id\":\"member-3\",\"name\":\"Carlos\"}]";
        SpreadsheetAggregate aggregate = SpreadsheetAggregate.createOrUpdate(
                "tenant-alpha",
                2026,
                dataJson,
                membersJson,
                BigDecimal.valueOf(25000.00),
                0
        );

        assertEquals(membersJson, aggregate.getMembersJson());
        List<DomainEvent> events = aggregate.getUncommittedEvents();
        assertEquals(1, events.size());
        SpreadsheetUpdatedEvent event = (SpreadsheetUpdatedEvent) events.get(0);
        assertEquals(membersJson, event.getMembersJson());
    }
}
