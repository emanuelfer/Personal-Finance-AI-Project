package com.personalfinance.domain.aggregate;

import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.ReceiptIngestedEvent;
import com.personalfinance.domain.event.ReceiptProcessedEvent;
import com.personalfinance.domain.event.ReceiptReconciledEvent;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class ReceiptAggregate extends AggregateRoot {

    public enum Status {
        PENDING,
        EXTRACTED,
        RECONCILED,
        FAILED
    }

    private String fileName;
    private String contentType;
    private long fileSizeBytes;
    private Status status;
    private String merchant;
    private BigDecimal totalAmount;
    private BigDecimal taxAmount;
    private Instant receiptDate;
    private String suggestedCategory;
    private double confidenceScore;
    private List<Map<String, Object>> lineItems = new ArrayList<>();
    private String rawText;
    private String reconciledTransactionId;
    private String reconciledAccountId;

    public ReceiptAggregate() {
    }

    public static ReceiptAggregate ingest(String tenantId, String receiptId, String fileName, String contentType, long fileSizeBytes) {
        Objects.requireNonNull(tenantId, "tenantId cannot be null");
        Objects.requireNonNull(receiptId, "receiptId cannot be null");
        Objects.requireNonNull(fileName, "fileName cannot be null");

        ReceiptAggregate aggregate = new ReceiptAggregate();
        long nextVersion = 1;
        ReceiptIngestedEvent event = new ReceiptIngestedEvent(
                tenantId,
                receiptId,
                nextVersion,
                fileName,
                contentType != null ? contentType : "application/octet-stream",
                fileSizeBytes
        );
        aggregate.applyChange(event);
        return aggregate;
    }

    public void processExtraction(String merchant, BigDecimal totalAmount, BigDecimal taxAmount,
                                  Instant receiptDate, String suggestedCategory,
                                  double confidenceScore, List<Map<String, Object>> lineItems,
                                  String rawText) {
        if (this.status != Status.PENDING && this.status != Status.EXTRACTED) {
            throw new IllegalStateException("Cannot process receipt in status: " + this.status);
        }

        long nextVersion = this.version + 1;
        ReceiptProcessedEvent event = new ReceiptProcessedEvent(
                this.tenantId,
                this.id,
                nextVersion,
                merchant,
                totalAmount,
                taxAmount,
                receiptDate != null ? receiptDate : Instant.now(),
                suggestedCategory,
                confidenceScore,
                lineItems != null ? lineItems : List.of(),
                rawText
        );
        applyChange(event);
    }

    public void reconcile(String transactionId, String accountId, BigDecimal reconciledAmount) {
        if (this.status == Status.RECONCILED) {
            throw new IllegalStateException("Receipt is already reconciled");
        }
        Objects.requireNonNull(transactionId, "transactionId cannot be null");
        Objects.requireNonNull(accountId, "accountId cannot be null");

        long nextVersion = this.version + 1;
        ReceiptReconciledEvent event = new ReceiptReconciledEvent(
                this.tenantId,
                this.id,
                nextVersion,
                transactionId,
                accountId,
                reconciledAmount != null ? reconciledAmount : this.totalAmount
        );
        applyChange(event);
    }

    @Override
    protected void handle(DomainEvent event) {
        if (event instanceof ReceiptIngestedEvent e) {
            this.id = e.getReceiptId();
            this.tenantId = e.getTenantId();
            this.fileName = e.getFileName();
            this.contentType = e.getContentType();
            this.fileSizeBytes = e.getFileSizeBytes();
            this.status = Status.PENDING;
        } else if (event instanceof ReceiptProcessedEvent e) {
            this.merchant = e.getMerchant();
            this.totalAmount = e.getTotalAmount();
            this.taxAmount = e.getTaxAmount();
            this.receiptDate = e.getReceiptDate();
            this.suggestedCategory = e.getSuggestedCategory();
            this.confidenceScore = e.getConfidenceScore();
            this.lineItems = e.getLineItems() != null ? e.getLineItems() : new ArrayList<>();
            this.rawText = e.getRawText();
            this.status = Status.EXTRACTED;
        } else if (event instanceof ReceiptReconciledEvent e) {
            this.reconciledTransactionId = e.getTransactionId();
            this.reconciledAccountId = e.getAccountId();
            if (e.getReconciledAmount() != null) {
                this.totalAmount = e.getReconciledAmount();
            }
            this.status = Status.RECONCILED;
        }
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public Status getStatus() {
        return status;
    }

    public String getMerchant() {
        return merchant;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public Instant getReceiptDate() {
        return receiptDate;
    }

    public String getSuggestedCategory() {
        return suggestedCategory;
    }

    public double getConfidenceScore() {
        return confidenceScore;
    }

    public List<Map<String, Object>> getLineItems() {
        return lineItems;
    }

    public String getRawText() {
        return rawText;
    }

    public String getReconciledTransactionId() {
        return reconciledTransactionId;
    }

    public String getReconciledAccountId() {
        return reconciledAccountId;
    }
}
