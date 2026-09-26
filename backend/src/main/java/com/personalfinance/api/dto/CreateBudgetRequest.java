package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class CreateBudgetRequest {
    @JsonProperty("budgetId")
    public String budgetId;

    @JsonProperty("category")
    public String category;

    @JsonProperty("monthlyLimit")
    public BigDecimal monthlyLimit;

    @JsonProperty("monthYear")
    public String monthYear;
}
