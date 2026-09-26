package com.personalfinance.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.agroal.api.AgroalDataSource;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Path("/api/catalog/expenses")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@ApplicationScoped
public class ExpenseCatalogResource {

    private static final Logger LOG = Logger.getLogger(ExpenseCatalogResource.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    ObjectMapper objectMapper;

    private void ensureTableExists(Connection conn, String tenantId) throws SQLException {
        String ddl = """
            CREATE TABLE IF NOT EXISTS expense_catalog (
                id VARCHAR(64) PRIMARY KEY,
                tenant_id VARCHAR(64) NOT NULL,
                description VARCHAR(255) NOT NULL,
                default_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                owner VARCHAR(32) NOT NULL DEFAULT 'Compartilhado',
                category VARCHAR(64) NOT NULL DEFAULT 'GERAL',
                icon VARCHAR(16) DEFAULT '💳',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_expense_catalog_tenant ON expense_catalog(tenant_id, owner);
        """;
        try (PreparedStatement stmt = conn.prepareStatement(ddl)) {
            stmt.execute();
        }

        // Seed default items if catalog is empty for this tenant
        String countSql = "SELECT COUNT(*) FROM expense_catalog WHERE tenant_id = ?";
        try (PreparedStatement countStmt = conn.prepareStatement(countSql)) {
            countStmt.setString(1, tenantId);
            try (ResultSet rs = countStmt.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    seedDefaults(conn, tenantId);
                }
            }
        }
    }

    private void seedDefaults(Connection conn, String tenantId) throws SQLException {
        String insertSql = """
            INSERT INTO expense_catalog (id, tenant_id, description, default_amount, owner, category, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """;

        Object[][] defaults = {
            {"cat-cartao", "Cartão de Crédito", 0.00, "Compartilhado", "CARTAO", "💳"},
            {"cat-moradia", "Moradia / Aluguel", 0.00, "Compartilhado", "MORADIA", "🏠"},
            {"cat-contas", "Contas de Consumo", 0.00, "Compartilhado", "CONTAS", "💡"},
            {"cat-mercado", "Supermercado", 0.00, "Compartilhado", "ALIMENTACAO", "🛒"},
            {"cat-internet", "Internet & Telefonia", 0.00, "Compartilhado", "UTILIDADES", "🌐"},
            {"cat-transporte", "Transporte / Mobilidade", 0.00, "Compartilhado", "TRANSPORTE", "🚗"},
            {"cat-lazer", "Lazer & Cultura", 0.00, "Compartilhado", "LAZER", "🎬"}
        };

        try (PreparedStatement stmt = conn.prepareStatement(insertSql)) {
            for (Object[] def : defaults) {
                stmt.setString(1, (String) def[0]);
                stmt.setString(2, tenantId);
                stmt.setString(3, (String) def[1]);
                stmt.setBigDecimal(4, BigDecimal.valueOf((Double) def[2]));
                stmt.setString(5, (String) def[3]);
                stmt.setString(6, (String) def[4]);
                stmt.setString(7, (String) def[5]);
                stmt.addBatch();
            }
            stmt.executeBatch();
            LOG.infof("Seeded initial expense catalog items for tenant %s", tenantId);
        }
    }

    @GET
    @RunOnVirtualThread
    public Response getCatalog(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @QueryParam("owner") String owner) {
        
        StringBuilder sql = new StringBuilder("SELECT id, description, default_amount, owner, category, icon, created_at, updated_at FROM expense_catalog WHERE tenant_id = ?");
        if (owner != null && !owner.isBlank() && !"ALL".equalsIgnoreCase(owner)) {
            sql.append(" AND owner = ?");
        }
        sql.append(" ORDER BY owner ASC, description ASC");

        try (Connection conn = dataSource.getConnection()) {
            ensureTableExists(conn, tenantId);

            try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
                stmt.setString(1, tenantId);
                if (owner != null && !owner.isBlank() && !"ALL".equalsIgnoreCase(owner)) {
                    stmt.setString(2, owner);
                }

                List<Map<String, Object>> items = new ArrayList<>();
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", rs.getString("id"));
                        item.put("description", rs.getString("description"));
                        BigDecimal amt = rs.getBigDecimal("default_amount");
                        item.put("defaultAmount", amt != null ? amt.doubleValue() : 0.0);
                        item.put("owner", rs.getString("owner"));
                        item.put("category", rs.getString("category"));
                        item.put("icon", rs.getString("icon"));
                        item.put("createdAt", rs.getString("created_at"));
                        item.put("updatedAt", rs.getString("updated_at"));
                        items.add(item);
                    }
                }
                return Response.ok(items).build();
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error fetching expense catalog for tenant %s", tenantId);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @RunOnVirtualThread
    public Response createCatalogItem(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            Map<String, Object> payload) {
        
        String desc = (String) payload.get("description");
        if (desc == null || desc.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "Description is required")).build();
        }

        String id = (String) payload.getOrDefault("id", "cat-" + UUID.randomUUID().toString().substring(0, 8));
        Object amtObj = payload.get("defaultAmount");
        double defaultAmount = amtObj instanceof Number ? ((Number) amtObj).doubleValue() : 0.0;
        String owner = (String) payload.getOrDefault("owner", "Compartilhado");
        String category = (String) payload.getOrDefault("category", "GERAL");
        String icon = (String) payload.getOrDefault("icon", "💳");

        String sql = """
            INSERT INTO expense_catalog (id, tenant_id, description, default_amount, owner, category, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                description = EXCLUDED.description,
                default_amount = EXCLUDED.default_amount,
                owner = EXCLUDED.owner,
                category = EXCLUDED.category,
                icon = EXCLUDED.icon,
                updated_at = NOW()
        """;

        try (Connection conn = dataSource.getConnection()) {
            ensureTableExists(conn, tenantId);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, id);
                stmt.setString(2, tenantId);
                stmt.setString(3, desc.trim());
                stmt.setBigDecimal(4, BigDecimal.valueOf(defaultAmount));
                stmt.setString(5, owner);
                stmt.setString(6, category);
                stmt.setString(7, icon);

                stmt.executeUpdate();

                Map<String, Object> res = new HashMap<>(payload);
                res.put("id", id);
                res.put("tenantId", tenantId);
                res.put("description", desc.trim());
                res.put("defaultAmount", defaultAmount);
                res.put("owner", owner);
                res.put("category", category);
                res.put("icon", icon);
                return Response.status(Response.Status.CREATED).entity(res).build();
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error creating expense catalog item for tenant %s", tenantId);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}")
    @RunOnVirtualThread
    public Response updateCatalogItem(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @PathParam("id") String id,
            Map<String, Object> payload) {
        
        String desc = (String) payload.get("description");
        if (desc == null || desc.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "Description is required")).build();
        }

        Object amtObj = payload.get("defaultAmount");
        double defaultAmount = amtObj instanceof Number ? ((Number) amtObj).doubleValue() : 0.0;
        String owner = (String) payload.getOrDefault("owner", "Compartilhado");
        String category = (String) payload.getOrDefault("category", "GERAL");
        String icon = (String) payload.getOrDefault("icon", "💳");

        String sql = """
            UPDATE expense_catalog
            SET description = ?, default_amount = ?, owner = ?, category = ?, icon = ?, updated_at = NOW()
            WHERE tenant_id = ? AND id = ?
        """;

        try (Connection conn = dataSource.getConnection()) {
            ensureTableExists(conn, tenantId);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, desc.trim());
                stmt.setBigDecimal(2, BigDecimal.valueOf(defaultAmount));
                stmt.setString(3, owner);
                stmt.setString(4, category);
                stmt.setString(5, icon);
                stmt.setString(6, tenantId);
                stmt.setString(7, id);

                int updated = stmt.executeUpdate();
                if (updated == 0) {
                    return Response.status(Response.Status.NOT_FOUND).entity(Map.of("error", "Catalog item not found")).build();
                }

                Map<String, Object> res = new HashMap<>(payload);
                res.put("id", id);
                res.put("description", desc.trim());
                res.put("defaultAmount", defaultAmount);
                res.put("owner", owner);
                res.put("category", category);
                res.put("icon", icon);
                return Response.ok(res).build();
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error updating expense catalog item %s for tenant %s", id, tenantId);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/{id}")
    @RunOnVirtualThread
    public Response deleteCatalogItem(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @PathParam("id") String id) {
        
        String sql = "DELETE FROM expense_catalog WHERE tenant_id = ? AND id = ?";

        try (Connection conn = dataSource.getConnection()) {
            ensureTableExists(conn, tenantId);

            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, tenantId);
                stmt.setString(2, id);

                int deleted = stmt.executeUpdate();
                return Response.ok(Map.of("deleted", deleted > 0, "id", id)).build();
            }
        } catch (Exception e) {
            LOG.errorf(e, "Error deleting expense catalog item %s for tenant %s", id, tenantId);
            return Response.serverError().entity(Map.of("error", e.getMessage())).build();
        }
    }
}
