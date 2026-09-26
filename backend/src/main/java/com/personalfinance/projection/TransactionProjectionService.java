package com.personalfinance.projection;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.personalfinance.domain.event.AccountCreatedEvent;
import com.personalfinance.domain.event.TransactionRecordedEvent;
import com.personalfinance.infrastructure.redis.RedisMaterializedViewRepository;
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

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@ApplicationScoped
public class TransactionProjectionService {

    private static final Logger LOG = Logger.getLogger(TransactionProjectionService.class);
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM").withZone(ZoneOffset.UTC);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    RedisMaterializedViewRepository redisRepository;

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

    @Incoming("transaction-events-in")
    @RunOnVirtualThread
    public void consumeTransactionEvent(String messagePayload) {
        try {
            JsonNode node = objectMapper.readTree(messagePayload);
            String eventType = node.has("eventType") ? node.get("eventType").asText() : "";
            if ("ACCOUNT_CREATED".equalsIgnoreCase(eventType)) {
                AccountCreatedEvent event = objectMapper.treeToValue(node, AccountCreatedEvent.class);
                projectAccountCreated(event);
            } else if ("TRANSACTION_RECORDED".equalsIgnoreCase(eventType)) {
                TransactionRecordedEvent event = objectMapper.treeToValue(node, TransactionRecordedEvent.class);
                projectTransaction(event);
            }
        } catch (Exception e) {
            LOG.warnf("Error processing transaction event: %s", e.getMessage());
        }
    }

    public void projectAccountCreated(AccountCreatedEvent event) {
        try {
            redisRepository.saveAccountBalance(
                    event.getTenantId(),
                    event.getAggregateId(),
                    event.getName(),
                    event.getType(),
                    event.getCurrency(),
                    event.getInitialBalance() != null ? event.getInitialBalance() : BigDecimal.ZERO,
                    event.getVersion()
            );
        } catch (Exception e) {
            LOG.warnf("Failed to project account to Redis: %s", e.getMessage());
        }
    }

    public void projectTransaction(TransactionRecordedEvent event) {
        try {
            String yearMonth = MONTH_FORMATTER.format(event.getTransactionDate());
            boolean isIncome = "INCOME".equalsIgnoreCase(event.getType());

            redisRepository.incrementMonthlyCategorySpending(
                    event.getTenantId(),
                    yearMonth,
                    event.getCategory(),
                    event.getAmount(),
                    isIncome
            );

            // Generate semantic embeddings for pgvector
            String textForEmbedding = String.format("Transaction %s: %s of $%.2f at %s. Category: %s. Description: %s",
                    event.getType(),
                    event.getTransactionId(),
                    event.getAmount().doubleValue(),
                    event.getMerchant() != null ? event.getMerchant() : "N/A",
                    event.getCategory(),
                    event.getDescription() != null ? event.getDescription() : "");

            float[] embedding = embeddingService.embed(textForEmbedding);
            Map<String, Object> meta = Map.of(
                    "accountId", event.getAccountId() != null ? event.getAccountId() : "",
                    "amount", event.getAmount().doubleValue(),
                    "category", event.getCategory() != null ? event.getCategory() : "",
                    "type", event.getType() != null ? event.getType() : ""
            );

            pgVectorRepository.saveEmbedding(
                    event.getTenantId(),
                    event.getTransactionId(),
                    "TRANSACTION",
                    textForEmbedding,
                    objectMapper.writeValueAsString(meta),
                    embedding
            );
        } catch (Exception e) {
            LOG.warnf("Failed to project transaction: %s", e.getMessage());
        }
    }
}
