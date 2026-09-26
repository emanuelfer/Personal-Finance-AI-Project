package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;

public class CreateAccountRequest {
    @JsonProperty("accountId")
    public String accountId;

    @JsonProperty("name")
    public String name;

    @JsonProperty("type")
    public String type;

    @JsonProperty("currency")
    public String currency;

    @JsonProperty("initialBalance")
    @JsonAlias({"balance", "initial_balance"})
    public BigDecimal initialBalance;
}
