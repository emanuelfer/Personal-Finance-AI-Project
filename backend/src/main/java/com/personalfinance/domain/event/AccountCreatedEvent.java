package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class AccountCreatedEvent extends BaseEvent {

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private String type; // CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("initialBalance")
    private BigDecimal initialBalance;

    public AccountCreatedEvent() {
        super();
    }

    public AccountCreatedEvent(String tenantId, String accountId, long version, String name, String type, String currency, BigDecimal initialBalance) {
        super(tenantId, accountId, "ACCOUNT", "ACCOUNT_CREATED", version);
        this.name = name;
        this.type = type;
        this.currency = currency;
        this.initialBalance = initialBalance != null ? initialBalance : BigDecimal.ZERO;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    public void setInitialBalance(BigDecimal initialBalance) {
        this.initialBalance = initialBalance;
    }
}
