package com.personalfinance.infrastructure.vector;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgvector.PGvector;
import io.agroal.api.AgroalDataSource;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class PgVectorRepository {

    private static final Logger LOG = Logger.getLogger(PgVectorRepository.class);

    @Inject
    AgroalDataSource dataSource;

    @Inject
    Tracer tracer;

    public static class VectorMatch {
        private String sourceId;
        private String sourceType;
        private String textContent;
        private Map<String, Object> metadata;
        private double similarityScore; // 1.0 - distance

        public VectorMatch(String sourceId, String sourceType, String textContent, Map<String, Object> metadata, double similarityScore) {
            this.sourceId = sourceId;
            this.sourceType = sourceType;
            this.textContent = textContent;
            this.metadata = metadata;
            this.similarityScore = similarityScore;
        }

        public String getSourceId() {
            return sourceId;
        }

        public String getSourceType() {
            return sourceType;
        }

        public String getTextContent() {
            return textContent;
        }

        public Map<String, Object> getMetadata() {
            return metadata;
        }

        public double getSimilarityScore() {
            return similarityScore;
        }
    }

    public void saveEmbedding(String tenantId, String sourceId, String sourceType, String textContent, String metadataJson, float[] vector) {
        Span span = tracer.spanBuilder("PgVectorRepository.saveEmbedding")
                .setAttribute("tenant.id", tenantId)
                .setAttribute("source.id", sourceId)
                .setAttribute("source.type", sourceType)
                .startSpan();

        String sql = "INSERT INTO financial_embeddings (tenant_id, source_id, source_type, text_content, metadata, embedding) " +
                "VALUES (?, ?, ?, ?, ?::jsonb, ?::vector)";

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, tenantId);
            stmt.setString(2, sourceId);
            stmt.setString(3, sourceType);
            stmt.setString(4, textContent);
            stmt.setString(5, metadataJson != null ? metadataJson : "{}");
            stmt.setObject(6, new PGvector(vector).getValue());

            stmt.executeUpdate();
            LOG.debugf("Stored vector embedding for %s (%s, tenant %s)", sourceId, sourceType, tenantId);
        } catch (SQLException e) {
            span.recordException(e);
            LOG.errorf(e, "Failed to store vector embedding for %s", sourceId);
        } finally {
            span.end();
        }
    }

    public List<VectorMatch> searchSimilar(String tenantId, float[] queryVector, int limit) {
        Span span = tracer.spanBuilder("PgVectorRepository.searchSimilar")
                .setAttribute("tenant.id", tenantId)
                .setAttribute("search.limit", limit)
                .startSpan();

        String sql = "SELECT source_id, source_type, text_content, metadata, (embedding <=> ?::vector) AS distance " +
                "FROM financial_embeddings WHERE tenant_id = ? ORDER BY distance ASC LIMIT ?";

        List<VectorMatch> results = new ArrayList<>();
        ObjectMapper mapper = new ObjectMapper();

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setObject(1, new PGvector(queryVector).getValue());
            stmt.setString(2, tenantId);
            stmt.setInt(3, Math.max(1, Math.min(limit, 50)));

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String sourceId = rs.getString("source_id");
                    String sourceType = rs.getString("source_type");
                    String content = rs.getString("text_content");
                    String metaJson = rs.getString("metadata");
                    double distance = rs.getDouble("distance");
                    double similarity = Math.max(0.0, 1.0 - distance);

                    Map<String, Object> metadata = new HashMap<>();
                    if (metaJson != null && !metaJson.isBlank()) {
                        try {
                            metadata = mapper.readValue(metaJson, Map.class);
                        } catch (Exception ignored) {}
                    }

                    results.add(new VectorMatch(sourceId, sourceType, content, metadata, similarity));
                }
            }
        } catch (SQLException e) {
            span.recordException(e);
            LOG.errorf(e, "Error executing pgvector similarity search for tenant %s", tenantId);
        } finally {
            span.end();
        }

        return results;
    }
}
