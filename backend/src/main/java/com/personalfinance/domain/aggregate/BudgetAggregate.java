package com.personalfinance.domain.aggregate;

import com.personalfinance.domain.event.BudgetCreatedEvent;
import com.personalfinance.domain.event.BudgetExceededEvent;
import com.personalfinance.domain.event.DomainEvent;

import java.math.BigDecimal;
import java.util.Objects;

public class BudgetAggregate extends AggregateRoot {

    private String category;
    private BigDecimal monthlyLimit = BigDecimal.ZERO;
    private BigDecimal currentSpent = BigDecimal.ZERO;
    private String monthYear; // YYYY-MM

    public BudgetAggregate() {
    }

    public static BudgetAggregate create(String tenantId, String budgetId, String category, BigDecimal monthlyLimit, String monthYear) {
        Objects.requireNonNull(tenantId, "tenantId cannot be null");
        Objects.requireNonNull(budgetId, "budgetId cannot be null");
        Objects.requireNonNull(category, "category cannot be null");
        Objects.requireNonNull(monthYear, "monthYear cannot be null");

        BudgetAggregate aggregate = new BudgetAggregate();
        long nextVersion = 1;
        BudgetCreatedEvent event = new BudgetCreatedEvent(
                tenantId,
                budgetId,
                nextVersion,
                category,
                monthlyLimit != null ? monthlyLimit : BigDecimal.ZERO,
                monthYear
        );
        aggregate.applyChange(event);
        return aggregate;
    }

    public void trackExpense(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal newTotal = this.currentSpent.add(amount);
        if (newTotal.compareTo(this.monthlyLimit) > 0) {
            BigDecimal excess = newTotal.subtract(this.monthlyLimit);
            long nextVersion = this.version + 1;
            BudgetExceededEvent event = new BudgetExceededEvent(
                    this.tenantId,
                    this.id,
                    nextVersion,
                    this.category,
                    this.monthlyLimit,
                    newTotal,
                    excess
            );
            applyChange(event);
        } else {
            this.currentSpent = newTotal;
        }
    }

    @Override
    protected void handle(DomainEvent event) {
        if (event instanceof BudgetCreatedEvent e) {
            this.id = e.getBudgetId();
            this.tenantId = e.getTenantId();
            this.category = e.getCategory();
            this.monthlyLimit = e.getMonthlyLimit() != null ? e.getMonthlyLimit() : BigDecimal.ZERO;
            this.monthYear = e.getMonthYear();
            this.currentSpent = BigDecimal.ZERO;
        } else if (event instanceof BudgetExceededEvent e) {
            this.currentSpent = e.getCurrentSpent();
        }
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getMonthlyLimit() {
        return monthlyLimit;
    }

    public BigDecimal getCurrentSpent() {
        return currentSpent;
    }

    public String getMonthYear() {
        return monthYear;
    }
}
