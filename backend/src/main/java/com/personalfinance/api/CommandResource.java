package com.personalfinance.api;

import com.personalfinance.ai.receipt.ReceiptExtractionService;
import com.personalfinance.api.dto.CreateAccountRequest;
import com.personalfinance.api.dto.CreateBudgetRequest;
import com.personalfinance.api.dto.IngestReceiptRequest;
import com.personalfinance.api.dto.ReconcileReceiptRequest;
import com.personalfinance.api.dto.RecordTransactionRequest;
import com.personalfinance.domain.aggregate.AccountAggregate;
import com.personalfinance.domain.aggregate.BudgetAggregate;
import com.personalfinance.domain.aggregate.ReceiptAggregate;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.infrastructure.eventstore.EventStore;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/commands")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CommandResource {

    private static final Logger LOG = Logger.getLogger(CommandResource.class);

    @Inject
    EventStore eventStore;

    @Inject
    ReceiptExtractionService receiptExtractionService;

    @Inject
    Tracer tracer;

    @POST
    @Path("/accounts")
    @RunOnVirtualThread
    public Response createAccount(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            CreateAccountRequest request) {

        Span span = tracer.spanBuilder("Command.createAccount").startSpan();
        try {
            String accountId = request.accountId != null ? request.accountId : "acc-" + UUID.randomUUID().toString().substring(0, 8);
            AccountAggregate aggregate = AccountAggregate.create(
                    tenantId,
                    accountId,
                    request.name != null ? request.name : "Primary Checking",
                    request.type != null ? request.type : "CHECKING",
                    request.currency != null ? request.currency : "USD",
                    request.initialBalance != null ? request.initialBalance : BigDecimal.ZERO
            );

            eventStore.appendEvents(tenantId, "ACCOUNT", accountId, aggregate.getUncommittedEvents(), 0);
            aggregate.markChangesAsCommitted();

            return Response.status(Response.Status.CREATED).entity(Map.of(
                    "status", "SUCCESS",
                    "accountId", accountId,
                    "version", aggregate.getVersion()
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            LOG.errorf(e, "Error creating account for tenant %s", tenantId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }

    @POST
    @Path("/transactions")
    @RunOnVirtualThread
    public Response recordTransaction(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            RecordTransactionRequest request) {

        Span span = tracer.spanBuilder("Command.recordTransaction").startSpan();
        try {
            if (request.accountId == null) {
                return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "accountId is required")).build();
            }

            List<DomainEvent> history = eventStore.loadEvents(tenantId, request.accountId);
            AccountAggregate aggregate = new AccountAggregate();
            if (!history.isEmpty()) {
                aggregate.loadFromHistory(history);
            } else {
                // Auto-create account if not present
                aggregate = AccountAggregate.create(tenantId, request.accountId, "Main Account", "CHECKING", "USD", BigDecimal.ZERO);
                eventStore.appendEvents(tenantId, "ACCOUNT", request.accountId, aggregate.getUncommittedEvents(), 0);
                aggregate.markChangesAsCommitted();
            }

            String txId = request.transactionId != null ? request.transactionId : "tx-" + UUID.randomUUID().toString().substring(0, 8);
            long expectedVersion = aggregate.getVersion();

            aggregate.recordTransaction(
                    txId,
                    request.amount,
                    request.type != null ? request.type : "EXPENSE",
                    request.category != null ? request.category : "GENERAL",
                    request.merchant,
                    request.description,
                    request.receiptId,
                    request.transactionDate != null ? request.transactionDate : Instant.now()
            );

            eventStore.appendEvents(tenantId, "ACCOUNT", request.accountId, aggregate.getUncommittedEvents(), expectedVersion);
            aggregate.markChangesAsCommitted();

            return Response.ok(Map.of(
                    "status", "COMMITTED",
                    "transactionId", txId,
                    "accountId", request.accountId,
                    "newVersion", aggregate.getVersion()
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            LOG.errorf(e, "Error recording transaction for tenant %s", tenantId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }

    @POST
    @Path("/budgets")
    @RunOnVirtualThread
    public Response createBudget(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            CreateBudgetRequest request) {

        Span span = tracer.spanBuilder("Command.createBudget").startSpan();
        try {
            String budgetId = request.budgetId != null ? request.budgetId : "bgt-" + UUID.randomUUID().toString().substring(0, 8);
            BudgetAggregate aggregate = BudgetAggregate.create(
                    tenantId,
                    budgetId,
                    request.category,
                    request.monthlyLimit,
                    request.monthYear != null ? request.monthYear : "2026-08"
            );

            eventStore.appendEvents(tenantId, "BUDGET", budgetId, aggregate.getUncommittedEvents(), 0);
            aggregate.markChangesAsCommitted();

            return Response.status(Response.Status.CREATED).entity(Map.of(
                    "status", "CREATED",
                    "budgetId", budgetId,
                    "version", aggregate.getVersion()
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }

    @POST
    @Path("/receipts/ingest")
    @RunOnVirtualThread
    public Response ingestReceipt(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            IngestReceiptRequest request) {

        Span span = tracer.spanBuilder("Command.ingestReceipt").startSpan();
        try {
            String receiptId = request.receiptId != null ? request.receiptId : "rcpt-" + UUID.randomUUID().toString().substring(0, 8);
            String fileName = request.fileName != null ? request.fileName : "receipt.pdf";

            ReceiptAggregate aggregate = ReceiptAggregate.ingest(
                    tenantId,
                    receiptId,
                    fileName,
                    request.contentType != null ? request.contentType : "image/jpeg",
                    request.fileSizeBytes > 0 ? request.fileSizeBytes : 1024
            );

            eventStore.appendEvents(tenantId, "RECEIPT", receiptId, aggregate.getUncommittedEvents(), 0);
            aggregate.markChangesAsCommitted();

            // Run AI OCR / Multimodal Extraction
            String text = request.rawText != null ? request.rawText :
                    "Starbucks Coffee #1042\nTotal: $14.85\nTax: $1.20\nLatte $6.50\nCroissant $4.50\nTip $2.65\nThank you for visiting!";

            ReceiptExtractionService.ExtractionResult result = receiptExtractionService.processReceipt(tenantId, receiptId, text);

            return Response.status(Response.Status.ACCEPTED).entity(Map.of(
                    "status", "INGESTED_AND_EXTRACTED",
                    "receiptId", receiptId,
                    "extraction", result
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            LOG.errorf(e, "Error ingesting receipt for tenant %s", tenantId);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }

    @POST
    @Path("/receipts/{id}/reconcile")
    @RunOnVirtualThread
    public Response reconcileReceipt(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @PathParam("id") String receiptId,
            ReconcileReceiptRequest request) {

        Span span = tracer.spanBuilder("Command.reconcileReceipt").startSpan();
        try {
            List<DomainEvent> history = eventStore.loadEvents(tenantId, receiptId);
            if (history.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND).entity(Map.of("error", "Receipt not found")).build();
            }

            ReceiptAggregate receipt = new ReceiptAggregate();
            receipt.loadFromHistory(history);

            String txId = "tx-rcpt-" + UUID.randomUUID().toString().substring(0, 8);
            String accountId = request.accountId != null ? request.accountId : "acc-primary";
            BigDecimal amount = request.amount != null ? request.amount : (receipt.getTotalAmount() != null ? receipt.getTotalAmount() : BigDecimal.TEN);

            // Reconcile receipt
            long expectedReceiptVersion = receipt.getVersion();
            receipt.reconcile(txId, accountId, amount);
            eventStore.appendEvents(tenantId, "RECEIPT", receiptId, receipt.getUncommittedEvents(), expectedReceiptVersion);
            receipt.markChangesAsCommitted();

            // Record transaction on account aggregate
            List<DomainEvent> accHistory = eventStore.loadEvents(tenantId, accountId);
            AccountAggregate account = new AccountAggregate();
            if (!accHistory.isEmpty()) {
                account.loadFromHistory(accHistory);
            } else {
                account = AccountAggregate.create(tenantId, accountId, "Checking", "CHECKING", "USD", BigDecimal.valueOf(5000));
                eventStore.appendEvents(tenantId, "ACCOUNT", accountId, account.getUncommittedEvents(), 0);
                account.markChangesAsCommitted();
            }

            long expectedAccVersion = account.getVersion();
            account.recordTransaction(
                    txId,
                    amount,
                    "EXPENSE",
                    request.category != null ? request.category : (receipt.getSuggestedCategory() != null ? receipt.getSuggestedCategory() : "DINING"),
                    request.merchant != null ? request.merchant : receipt.getMerchant(),
                    request.description != null ? request.description : "Receipt auto-reconciliation: " + receipt.getFileName(),
                    receiptId,
                    Instant.now()
            );

            eventStore.appendEvents(tenantId, "ACCOUNT", accountId, account.getUncommittedEvents(), expectedAccVersion);
            account.markChangesAsCommitted();

            return Response.ok(Map.of(
                    "status", "RECONCILED",
                    "receiptId", receiptId,
                    "transactionId", txId,
                    "accountId", accountId,
                    "amount", amount
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }
}
