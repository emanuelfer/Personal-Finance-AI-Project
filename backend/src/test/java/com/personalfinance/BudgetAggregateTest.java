package com.personalfinance;

import com.personalfinance.domain.aggregate.BudgetAggregate;
import com.personalfinance.domain.event.BudgetCreatedEvent;
import com.personalfinance.domain.event.BudgetExceededEvent;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

public class BudgetAggregateTest {

    @Test
    void testBudgetTrackingAndExceededEvent() {
        BudgetAggregate aggregate = BudgetAggregate.create(
                "tenant-1",
                "bgt-1",
                "DINING",
                BigDecimal.valueOf(300),
                "2026-08"
        );

        assertEquals("DINING", aggregate.getCategory());
        assertEquals(BigDecimal.valueOf(300), aggregate.getMonthlyLimit());
        assertEquals(1, aggregate.getVersion());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof BudgetCreatedEvent);

        aggregate.markChangesAsCommitted();

        // Track expense within limit
        aggregate.trackExpense(BigDecimal.valueOf(150));
        assertEquals(BigDecimal.valueOf(150), aggregate.getCurrentSpent());
        assertTrue(aggregate.getUncommittedEvents().isEmpty());

        // Track expense that exceeds limit
        aggregate.trackExpense(BigDecimal.valueOf(200)); // Total 350 > 300
        assertEquals(2, aggregate.getVersion());
        assertEquals(1, aggregate.getUncommittedEvents().size());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof BudgetExceededEvent);

        BudgetExceededEvent exceeded = (BudgetExceededEvent) aggregate.getUncommittedEvents().get(0);
        assertEquals(BigDecimal.valueOf(350), exceeded.getCurrentSpent());
        assertEquals(BigDecimal.valueOf(50), exceeded.getExcessAmount());
    }
}
