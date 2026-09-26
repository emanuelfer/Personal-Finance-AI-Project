package com.personalfinance.domain.aggregate;

import com.personalfinance.domain.event.AccountCreatedEvent;
import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.TransactionRecordedEvent;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

public class AccountAggregate extends AggregateRoot {

    private String name;
    private String type;
    private String currency;
    private BigDecimal currentBalance = BigDecimal.ZERO;
    private boolean active = false;

    public AccountAggregate() {
    }

    public static AccountAggregate create(String tenantId, String accountId, String name, String type, String currency, BigDecimal initialBalance) {
        Objects.requireNonNull(tenantId, "tenantId cannot be null");
        Objects.requireNonNull(accountId, "accountId cannot be null");
        Objects.requireNonNull(name, "name cannot be null");

        AccountAggregate aggregate = new AccountAggregate();
        long nextVersion = 1;
        AccountCreatedEvent event = new AccountCreatedEvent(
                tenantId,
                accountId,
                nextVersion,
                name,
                type != null ? type : "CHECKING",
                currency != null ? currency : "USD",
                initialBalance != null ? initialBalance : BigDecimal.ZERO
        );
        aggregate.applyChange(event);
        return aggregate;
    }

    public void recordTransaction(String transactionId, BigDecimal amount, String type,
                                  String category, String merchant, String description,
                                  String receiptId, Instant transactionDate) {
        if (!this.active) {
            throw new IllegalStateException("Account is not active");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transaction amount must be positive");
        }

        long nextVersion = this.version + 1;
        TransactionRecordedEvent event = new TransactionRecordedEvent(
                this.tenantId,
                this.id,
                nextVersion,
                transactionId,
                amount,
                type != null ? type : "EXPENSE",
                category != null ? category : "GENERAL",
                merchant,
                description,
                receiptId,
                transactionDate != null ? transactionDate : Instant.now()
        );
        applyChange(event);
    }

    @Override
    protected void handle(DomainEvent event) {
        if (event instanceof AccountCreatedEvent e) {
            this.id = e.getAggregateId();
            this.tenantId = e.getTenantId();
            this.name = e.getName();
            this.type = e.getType();
            this.currency = e.getCurrency();
            this.currentBalance = e.getInitialBalance() != null ? e.getInitialBalance() : BigDecimal.ZERO;
            this.active = true;
        } else if (event instanceof TransactionRecordedEvent e) {
            if ("INCOME".equalsIgnoreCase(e.getType())) {
                this.currentBalance = this.currentBalance.add(e.getAmount());
            } else {
                this.currentBalance = this.currentBalance.subtract(e.getAmount());
            }
        }
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public String getCurrency() {
        return currency;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public boolean isActive() {
        return active;
    }
}
