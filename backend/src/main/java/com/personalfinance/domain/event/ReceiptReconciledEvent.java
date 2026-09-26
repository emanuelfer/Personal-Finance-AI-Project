package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class ReceiptReconciledEvent extends BaseEvent {

    @JsonProperty("receiptId")
    private String receiptId;

    @JsonProperty("transactionId")
    private String transactionId;

    @JsonProperty("accountId")
    private String accountId;

    @JsonProperty("reconciledAmount")
    private BigDecimal reconciledAmount;

    public ReceiptReconciledEvent() {
        super();
    }

    public ReceiptReconciledEvent(String tenantId, String receiptId, long version,
                                 String transactionId, String accountId, BigDecimal reconciledAmount) {
        super(tenantId, receiptId, "RECEIPT", "RECEIPT_RECONCILED", version);
        this.receiptId = receiptId;
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.reconciledAmount = reconciledAmount;
    }

    public String getReceiptId() {
        return receiptId;
    }

    public void setReceiptId(String receiptId) {
        this.receiptId = receiptId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public BigDecimal getReconciledAmount() {
        return reconciledAmount;
    }

    public void setReconciledAmount(BigDecimal reconciledAmount) {
        this.reconciledAmount = reconciledAmount;
    }
}
