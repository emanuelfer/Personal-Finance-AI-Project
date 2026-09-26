package com.personalfinance.domain.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class SpreadsheetUpdatedEvent extends BaseEvent {

    @JsonProperty("year")
    private int year;

    @JsonProperty("dataJson")
    private String dataJson;

    @JsonProperty("baseInitialReserve")
    private BigDecimal baseInitialReserve;

    @JsonProperty("membersJson")
    private String membersJson;

    public SpreadsheetUpdatedEvent() {
        super();
    }

    public SpreadsheetUpdatedEvent(String tenantId, int year, long version, String dataJson, BigDecimal baseInitialReserve) {
        this(tenantId, year, version, dataJson, "[]", baseInitialReserve);
    }

    public SpreadsheetUpdatedEvent(String tenantId, int year, long version, String dataJson, String membersJson,
                                   BigDecimal baseInitialReserve) {
        super(tenantId, "spreadsheet-" + year, "SPREADSHEET", "SPREADSHEET_UPDATED", version);
        this.year = year;
        this.dataJson = dataJson;
        this.membersJson = membersJson != null ? membersJson : "[]";
        this.baseInitialReserve = baseInitialReserve != null ? baseInitialReserve : BigDecimal.valueOf(15500.00);
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public String getDataJson() {
        return dataJson;
    }

    public void setDataJson(String dataJson) {
        this.dataJson = dataJson;
    }

    public BigDecimal getBaseInitialReserve() {
        return baseInitialReserve;
    }

    public void setBaseInitialReserve(BigDecimal baseInitialReserve) {
        this.baseInitialReserve = baseInitialReserve;
    }

    public String getMembersJson() {
        return membersJson != null ? membersJson : "[]";
    }

    public void setMembersJson(String membersJson) {
        this.membersJson = membersJson;
    }
}
