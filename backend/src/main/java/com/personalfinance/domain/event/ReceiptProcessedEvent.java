package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class ReceiptProcessedEvent extends BaseEvent {

    @JsonProperty("receiptId")
    private String receiptId;

    @JsonProperty("merchant")
    private String merchant;

    @JsonProperty("totalAmount")
    private BigDecimal totalAmount;

    @JsonProperty("taxAmount")
    private BigDecimal taxAmount;

    @JsonProperty("receiptDate")
    private Instant receiptDate;

    @JsonProperty("suggestedCategory")
    private String suggestedCategory;

    @JsonProperty("confidenceScore")
    private double confidenceScore;

    @JsonProperty("lineItems")
    private List<Map<String, Object>> lineItems;

    @JsonProperty("rawText")
    private String rawText;

    public ReceiptProcessedEvent() {
        super();
    }

    public ReceiptProcessedEvent(String tenantId, String receiptId, long version,
                                 String merchant, BigDecimal totalAmount, BigDecimal taxAmount,
                                 Instant receiptDate, String suggestedCategory,
                                 double confidenceScore, List<Map<String, Object>> lineItems,
                                 String rawText) {
        super(tenantId, receiptId, "RECEIPT", "RECEIPT_PROCESSED", version);
        this.receiptId = receiptId;
        this.merchant = merchant;
        this.totalAmount = totalAmount;
        this.taxAmount = taxAmount;
        this.receiptDate = receiptDate;
        this.suggestedCategory = suggestedCategory;
        this.confidenceScore = confidenceScore;
        this.lineItems = lineItems;
        this.rawText = rawText;
    }

    public String getReceiptId() {
        return receiptId;
    }

    public void setReceiptId(String receiptId) {
        this.receiptId = receiptId;
    }

    public String getMerchant() {
        return merchant;
    }

    public void setMerchant(String merchant) {
        this.merchant = merchant;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public Instant getReceiptDate() {
        return receiptDate;
    }

    public void setReceiptDate(Instant receiptDate) {
        this.receiptDate = receiptDate;
    }

    public String getSuggestedCategory() {
        return suggestedCategory;
    }

    public void setSuggestedCategory(String suggestedCategory) {
        this.suggestedCategory = suggestedCategory;
    }

    public double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public List<Map<String, Object>> getLineItems() {
        return lineItems;
    }

    public void setLineItems(List<Map<String, Object>> lineItems) {
        this.lineItems = lineItems;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }
}
