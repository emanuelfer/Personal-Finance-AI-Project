package com.personalfinance.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class IngestReceiptRequest {
    @JsonProperty("receiptId")
    public String receiptId;

    @JsonProperty("fileName")
    public String fileName;

    @JsonProperty("contentType")
    public String contentType;

    @JsonProperty("fileSizeBytes")
    public long fileSizeBytes;

    @JsonProperty("rawText")
    public String rawText;
}
