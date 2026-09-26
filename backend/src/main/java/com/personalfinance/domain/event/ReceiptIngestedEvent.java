package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ReceiptIngestedEvent extends BaseEvent {

    @JsonProperty("receiptId")
    private String receiptId;

    @JsonProperty("fileName")
    private String fileName;

    @JsonProperty("contentType")
    private String contentType;

    @JsonProperty("fileSizeBytes")
    private long fileSizeBytes;

    public ReceiptIngestedEvent() {
        super();
    }

    public ReceiptIngestedEvent(String tenantId, String receiptId, long version, String fileName, String contentType, long fileSizeBytes) {
        super(tenantId, receiptId, "RECEIPT", "RECEIPT_INGESTED", version);
        this.receiptId = receiptId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getReceiptId() {
        return receiptId;
    }

    public void setReceiptId(String receiptId) {
        this.receiptId = receiptId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
}
