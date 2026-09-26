package com.personalfinance.projection;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.ReceiptIngestedEvent;
import com.personalfinance.domain.event.ReceiptProcessedEvent;
import com.personalfinance.domain.event.ReceiptReconciledEvent;
import com.personalfinance.infrastructure.vector.EmbeddingService;
import com.personalfinance.infrastructure.vector.PgVectorRepository;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class ReceiptProjectionService {

    private static final Logger LOG = Logger.getLogger(ReceiptProjectionService.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    EmbeddingService embeddingService;

    @Inject
    PgVectorRepository pgVectorRepository;

    @Inject
    Tracer tracer;

    private ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Incoming("receipt-events-in")
    @RunOnVirtualThread
    public void consumeReceiptEvent(String messagePayload) {
        try {
            if (messagePayload.contains("RECEIPT_INGESTED")) {
                ReceiptIngestedEvent event = objectMapper.readValue(messagePayload, ReceiptIngestedEvent.class);
                projectReceipt(event);
            } else if (messagePayload.contains("RECEIPT_PROCESSED")) {
                ReceiptProcessedEvent event = objectMapper.readValue(messagePayload, ReceiptProcessedEvent.class);
                projectReceipt(event);
            } else if (messagePayload.contains("RECEIPT_RECONCILED")) {
                ReceiptReconciledEvent event = objectMapper.readValue(messagePayload, ReceiptReconciledEvent.class);
                projectReceipt(event);
            }
        } catch (Exception e) {
            LOG.warnf("Error processing incoming receipt event: %s", e.getMessage());
        }
    }

    public void projectReceipt(DomainEvent event) {
        try {
            if (event instanceof ReceiptProcessedEvent e) {
                // Vector embedding for pgvector RAG
                String semanticText = String.format("Receipt from %s on %s for total $%.2f (tax $%.2f). Items: %s. Raw text: %s",
                        e.getMerchant() != null ? e.getMerchant() : "Unknown Merchant",
                        e.getReceiptDate() != null ? e.getReceiptDate().toString() : "N/A",
                        e.getTotalAmount() != null ? e.getTotalAmount().doubleValue() : 0.0,
                        e.getTaxAmount() != null ? e.getTaxAmount().doubleValue() : 0.0,
                        e.getLineItems() != null ? e.getLineItems().toString() : "[]",
                        e.getRawText() != null ? e.getRawText() : "");

                float[] vector = embeddingService.embed(semanticText);
                Map<String, Object> meta = new HashMap<>();
                meta.put("merchant", e.getMerchant());
                meta.put("totalAmount", e.getTotalAmount());
                meta.put("suggestedCategory", e.getSuggestedCategory());
                meta.put("confidence", e.getConfidenceScore());

                pgVectorRepository.saveEmbedding(
                        e.getTenantId(),
                        e.getReceiptId(),
                        "RECEIPT",
                        semanticText,
                        objectMapper.writeValueAsString(meta),
                        vector
                );
            }
        } catch (Exception ex) {
            LOG.warnf("Failed to process receipt embedding: %s", ex.getMessage());
        }
    }
}
