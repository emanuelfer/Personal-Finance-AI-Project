package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class ReconcileReceiptRequest {
    @JsonProperty("accountId")
    public String accountId;

    @JsonProperty("category")
    public String category;

    @JsonProperty("merchant")
    public String merchant;

    @JsonProperty("amount")
    public BigDecimal amount;

    @JsonProperty("description")
    public String description;
}
