package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;

public class TransactionRecordedEvent extends BaseEvent {

    @JsonProperty("transactionId")
    private String transactionId;

    @JsonProperty("accountId")
    private String accountId;

    @JsonProperty("amount")
    private BigDecimal amount;

    @JsonProperty("type")
    private String type; // INCOME, EXPENSE, TRANSFER

    @JsonProperty("category")
    private String category; // DINING, GROCERIES, HOUSING, UTILITIES, SALARY, INVESTMENT, TECH, etc.

    @JsonProperty("merchant")
    private String merchant;

    @JsonProperty("description")
    private String description;

    @JsonProperty("receiptId")
    private String receiptId;

    @JsonProperty("transactionDate")
    private Instant transactionDate;

    public TransactionRecordedEvent() {
        super();
    }

    public TransactionRecordedEvent(String tenantId, String accountId, long version,
                                   String transactionId, BigDecimal amount, String type,
                                   String category, String merchant, String description,
                                   String receiptId, Instant transactionDate) {
        super(tenantId, accountId, "ACCOUNT", "TRANSACTION_RECORDED", version);
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.amount = amount;
        this.type = type;
        this.category = category;
        this.merchant = merchant;
        this.description = description;
        this.receiptId = receiptId;
        this.transactionDate = transactionDate != null ? transactionDate : Instant.now();
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

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReceiptId() {
        return receiptId;
    }

    public void setReceiptId(String receiptId) {
        this.receiptId = receiptId;
    }

    public Instant getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(Instant transactionDate) {
        this.transactionDate = transactionDate;
    }
}
