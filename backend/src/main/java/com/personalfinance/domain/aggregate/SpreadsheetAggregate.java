package com.personalfinance.domain.aggregate;

import com.personalfinance.domain.event.DomainEvent;
import com.personalfinance.domain.event.SpreadsheetUpdatedEvent;

import java.math.BigDecimal;
import java.util.Objects;

public class SpreadsheetAggregate extends AggregateRoot {

    private int year;
    private String dataJson;
    private BigDecimal baseInitialReserve;
    private String membersJson;

    public SpreadsheetAggregate() {
    }

    public static SpreadsheetAggregate createOrUpdate(String tenantId, int year, String dataJson,
                                                      BigDecimal baseInitialReserve,
                                                      long currentVersion) {
        return createOrUpdate(tenantId, year, dataJson, "[]", baseInitialReserve, currentVersion);
    }

    public static SpreadsheetAggregate createOrUpdate(String tenantId, int year, String dataJson, String membersJson,
                                                      BigDecimal baseInitialReserve,
                                                      long currentVersion) {
        Objects.requireNonNull(tenantId, "tenantId cannot be null");
        Objects.requireNonNull(dataJson, "dataJson cannot be null");

        SpreadsheetAggregate aggregate = new SpreadsheetAggregate();
        aggregate.id = "spreadsheet-" + year;
        aggregate.tenantId = tenantId;
        aggregate.version = currentVersion;

        long nextVersion = currentVersion + 1;
        SpreadsheetUpdatedEvent event = new SpreadsheetUpdatedEvent(
                tenantId,
                year,
                nextVersion,
                dataJson,
                membersJson != null ? membersJson : "[]",
                baseInitialReserve
        );

        aggregate.applyChange(event);
        return aggregate;
    }

    @Override
    protected void handle(DomainEvent event) {
        if (event instanceof SpreadsheetUpdatedEvent e) {
            this.id = e.getAggregateId();
            this.tenantId = e.getTenantId();
            this.year = e.getYear();
            this.dataJson = e.getDataJson();
            this.membersJson = e.getMembersJson();
            this.baseInitialReserve = e.getBaseInitialReserve();
        }
    }

    public int getYear() {
        return year;
    }

    public String getDataJson() {
        return dataJson;
    }

    public BigDecimal getBaseInitialReserve() {
        return baseInitialReserve;
    }

    public String getMembersJson() {
        return membersJson != null ? membersJson : "[]";
    }
}
