package com.personalfinance;

import com.personalfinance.domain.aggregate.ReceiptAggregate;
import com.personalfinance.domain.event.ReceiptIngestedEvent;
import com.personalfinance.domain.event.ReceiptProcessedEvent;
import com.personalfinance.domain.event.ReceiptReconciledEvent;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class ReceiptAggregateTest {

    @Test
    void testReceiptLifecycle() {
        // 1. Ingest
        ReceiptAggregate aggregate = ReceiptAggregate.ingest(
                "tenant-1",
                "rcpt-1",
                "invoice-apple.pdf",
                "application/pdf",
                2048
        );

        assertEquals("rcpt-1", aggregate.getId());
        assertEquals(ReceiptAggregate.Status.PENDING, aggregate.getStatus());
        assertEquals(1, aggregate.getVersion());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof ReceiptIngestedEvent);

        aggregate.markChangesAsCommitted();

        // 2. Process Extraction
        aggregate.processExtraction(
                "Apple Store",
                BigDecimal.valueOf(129.99),
                BigDecimal.valueOf(10.50),
                Instant.now(),
                "TECH",
                0.98,
                List.of(Map.of("description", "MagSafe Charger", "price", 39.00)),
                "Raw receipt text from Apple Store"
        );

        assertEquals(ReceiptAggregate.Status.EXTRACTED, aggregate.getStatus());
        assertEquals("Apple Store", aggregate.getMerchant());
        assertEquals(BigDecimal.valueOf(129.99), aggregate.getTotalAmount());
        assertEquals(2, aggregate.getVersion());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof ReceiptProcessedEvent);

        aggregate.markChangesAsCommitted();

        // 3. Reconcile
        aggregate.reconcile("tx-100", "acc-primary", BigDecimal.valueOf(129.99));

        assertEquals(ReceiptAggregate.Status.RECONCILED, aggregate.getStatus());
        assertEquals("tx-100", aggregate.getReconciledTransactionId());
        assertEquals(3, aggregate.getVersion());
        assertTrue(aggregate.getUncommittedEvents().get(0) instanceof ReceiptReconciledEvent);
    }
}
