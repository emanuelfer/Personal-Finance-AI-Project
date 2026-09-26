package com.personalfinance.infrastructure.redis;

import io.quarkus.redis.datasource.RedisDataSource;
import io.quarkus.redis.datasource.hash.HashCommands;
import io.quarkus.redis.datasource.set.SetCommands;
import io.quarkus.redis.datasource.value.ValueCommands;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@ApplicationScoped
public class RedisMaterializedViewRepository {

    private static final Logger LOG = Logger.getLogger(RedisMaterializedViewRepository.class);

    private final HashCommands<String, String, String> hashCommands;
    private final SetCommands<String, String> setCommands;
    private final ValueCommands<String, String> valueCommands;

    @Inject
    public RedisMaterializedViewRepository(RedisDataSource redisDataSource) {
        this.hashCommands = redisDataSource.hash(String.class);
        this.setCommands = redisDataSource.set(String.class);
        this.valueCommands = redisDataSource.value(String.class);
    }

    public void saveAccountBalance(String tenantId, String accountId, String name, String type, String currency, BigDecimal balance, long version) {
        String key = String.format("tenant:%s:account:%s", tenantId, accountId);
        Map<String, String> data = new HashMap<>();
        data.put("accountId", accountId);
        data.put("name", name != null ? name : "Account");
        data.put("type", type != null ? type : "CHECKING");
        data.put("currency", currency != null ? currency : "USD");
        data.put("balance", balance != null ? balance.toPlainString() : "0.00");
        data.put("version", String.valueOf(version));
        data.put("updatedAt", String.valueOf(System.currentTimeMillis()));

        hashCommands.hset(key, data);
        setCommands.sadd(String.format("tenant:%s:accounts", tenantId), accountId);
        LOG.debugf("Updated Redis materialized view for account %s: balance=%s", accountId, balance);
    }

    public Map<String, String> getAccount(String tenantId, String accountId) {
        String key = String.format("tenant:%s:account:%s", tenantId, accountId);
        return hashCommands.hgetall(key);
    }

    public Set<String> getAccountIds(String tenantId) {
        return setCommands.smembers(String.format("tenant:%s:accounts", tenantId));
    }

    public void incrementMonthlyCategorySpending(String tenantId, String yearMonth, String category, BigDecimal amount, boolean isIncome) {
        String key = String.format("tenant:%s:metrics:%s", tenantId, yearMonth);
        String field = isIncome ? "total_income" : "total_expense";
        String catField = isIncome ? "cat_income:" + category : "cat_expense:" + category;

        try {
            double doubleVal = amount != null ? amount.doubleValue() : 0.0;
            hashCommands.hincrbyfloat(key, field, doubleVal);
            hashCommands.hincrbyfloat(key, catField, doubleVal);
        } catch (Exception e) {
            LOG.warnf(e, "Error updating Redis monthly metrics for tenant %s, month %s", tenantId, yearMonth);
        }
    }

    public Map<String, String> getMonthlyMetrics(String tenantId, String yearMonth) {
        String key = String.format("tenant:%s:metrics:%s", tenantId, yearMonth);
        return hashCommands.hgetall(key);
    }

    public void saveSpreadsheetState(String tenantId, int year, String jsonPayload) {
        String key = String.format("tenant:%s:spreadsheet:%d", tenantId, year);
        valueCommands.set(key, jsonPayload);
        LOG.debugf("Cached spreadsheet state in Redis for key %s", key);
    }

    public String getSpreadsheetState(String tenantId, int year) {
        String key = String.format("tenant:%s:spreadsheet:%d", tenantId, year);
        return valueCommands.get(key);
    }
}
