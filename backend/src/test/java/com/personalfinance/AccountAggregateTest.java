package com.personalfinance;

import com.personalfinance.domain.aggregate.AccountAggregate;
import com.personalfinance.domain.event.AccountCreatedEvent;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.TransactionRecordedEvent;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class AccountAggregateTest {

    @Test
    void testCreateAccountGeneratesEvent() {
        AccountAggregate aggregate = AccountAggregate.create(
                "tenant-1",
                "acc-101",
                "Savings Account",
                "SAVINGS",
                "USD",
                BigDecimal.valueOf(1000)
        );

        assertEquals("acc-101", aggregate.getId());
        assertEquals("tenant-1", aggregate.getTenantId());
        assertEquals("Savings Account", aggregate.getName());
        assertEquals(BigDecimal.valueOf(1000), aggregate.getCurrentBalance());
        assertEquals(1, aggregate.getVersion());

        List<DomainEvent> uncommitted = aggregate.getUncommittedEvents();
        assertEquals(1, uncommitted.size());
        assertTrue(uncommitted.get(0) instanceof AccountCreatedEvent);

        AccountCreatedEvent event = (AccountCreatedEvent) uncommitted.get(0);
        assertEquals("Savings Account", event.getName());
        assertEquals(BigDecimal.valueOf(1000), event.getInitialBalance());
    }

    @Test
    void testRecordTransactionUpdatesBalanceAndIncrementsVersion() {
        AccountAggregate aggregate = AccountAggregate.create(
                "tenant-1",
                "acc-101",
                "Checking Account",
                "CHECKING",
                "USD",
                BigDecimal.valueOf(500)
        );
        aggregate.markChangesAsCommitted();

        // Record expense
        aggregate.recordTransaction(
                "tx-1",
                BigDecimal.valueOf(50),
                "EXPENSE",
                "DINING",
                "Cafe",
                "Coffee and bagel",
                null,
                Instant.now()
        );

        assertEquals(BigDecimal.valueOf(450), aggregate.getCurrentBalance());
        assertEquals(2, aggregate.getVersion());
        assertEquals(1, aggregate.getUncommittedEvents().size());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof TransactionRecordedEvent);

        // Record income
        aggregate.recordTransaction(
                "tx-2",
                BigDecimal.valueOf(200),
                "INCOME",
                "SALARY",
                "Employer",
                "Bonus",
                null,
                Instant.now()
        );

        assertEquals(BigDecimal.valueOf(650), aggregate.getCurrentBalance());
        assertEquals(3, aggregate.getVersion());
    }

    @Test
    void testReplayFromHistoryRestoresState() {
        AccountCreatedEvent e1 = new AccountCreatedEvent("tenant-1", "acc-200", 1, "Replay Account", "CHECKING", "USD", BigDecimal.valueOf(100));
        TransactionRecordedEvent e2 = new TransactionRecordedEvent("tenant-1", "acc-200", 2, "tx-a", BigDecimal.valueOf(40), "EXPENSE", "GROCERIES", "Market", "Groceries", null, Instant.now());
        TransactionRecordedEvent e3 = new TransactionRecordedEvent("tenant-1", "acc-200", 3, "tx-b", BigDecimal.valueOf(150), "INCOME", "FREELANCE", "Client", "Design work", null, Instant.now());

        AccountAggregate replayed = new AccountAggregate();
        replayed.loadFromHistory(List.of(e1, e2, e3));

        assertEquals("acc-200", replayed.getId());
        assertEquals(3, replayed.getVersion());
        assertEquals(BigDecimal.valueOf(210), replayed.getCurrentBalance());
        assertTrue(replayed.getUncommittedEvents().isEmpty());
    }
}
