package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AdvisorChatRequest {
    @JsonProperty("message")
    public String message;
}
