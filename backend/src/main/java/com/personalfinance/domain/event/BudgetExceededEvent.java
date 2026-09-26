package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class BudgetExceededEvent extends BaseEvent {

    @JsonProperty("budgetId")
    private String budgetId;

    @JsonProperty("category")
    private String category;

    @JsonProperty("monthlyLimit")
    private BigDecimal monthlyLimit;

    @JsonProperty("currentSpent")
    private BigDecimal currentSpent;

    @JsonProperty("excessAmount")
    private BigDecimal excessAmount;

    public BudgetExceededEvent() {
        super();
    }

    public BudgetExceededEvent(String tenantId, String budgetId, long version,
                              String category, BigDecimal monthlyLimit, BigDecimal currentSpent, BigDecimal excessAmount) {
        super(tenantId, budgetId, "BUDGET", "BUDGET_EXCEEDED", version);
        this.budgetId = budgetId;
        this.category = category;
        this.monthlyLimit = monthlyLimit;
        this.currentSpent = currentSpent;
        this.excessAmount = excessAmount;
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

    public BigDecimal getCurrentSpent() {
        return currentSpent;
    }

    public void setCurrentSpent(BigDecimal currentSpent) {
        this.currentSpent = currentSpent;
    }

    public BigDecimal getExcessAmount() {
        return excessAmount;
    }

    public void setExcessAmount(BigDecimal excessAmount) {
        this.excessAmount = excessAmount;
    }
}
