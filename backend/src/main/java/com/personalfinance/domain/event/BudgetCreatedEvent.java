package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class BudgetCreatedEvent extends BaseEvent {

    @JsonProperty("budgetId")
    private String budgetId;

    @JsonProperty("category")
    private String category;

    @JsonProperty("monthlyLimit")
    private BigDecimal monthlyLimit;

    @JsonProperty("monthYear")
    private String monthYear; // YYYY-MM

    public BudgetCreatedEvent() {
        super();
    }

    public BudgetCreatedEvent(String tenantId, String budgetId, long version,
                              String category, BigDecimal monthlyLimit, String monthYear) {
        super(tenantId, budgetId, "BUDGET", "BUDGET_CREATED", version);
        this.budgetId = budgetId;
        this.category = category;
        this.monthlyLimit = monthlyLimit;
        this.monthYear = monthYear;
    }

    public String getBudgetId() {
        return budgetId;
    }

    public void setBudgetId(String budgetId) {
        this.budgetId = budgetId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getMonthlyLimit() {
        return monthlyLimit;
    }

    public void setMonthlyLimit(BigDecimal monthlyLimit) {
        this.monthlyLimit = monthlyLimit;
    }

    public String getMonthYear() {
        return monthYear;
    }

    public void setMonthYear(String monthYear) {
        this.monthYear = monthYear;
    }
}
