package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;

public class RecordTransactionRequest {
    @JsonProperty("transactionId")
    public String transactionId;

    @JsonProperty("accountId")
    public String accountId;

    @JsonProperty("amount")
    public BigDecimal amount;

    @JsonProperty("type")
    public String type; // INCOME, EXPENSE, TRANSFER

    @JsonProperty("category")
    public String category;

    @JsonProperty("merchant")
    public String merchant;

    @JsonProperty("description")
    public String description;

    @JsonProperty("receiptId")
    public String receiptId;

    @JsonProperty("transactionDate")
    public Instant transactionDate;
}
