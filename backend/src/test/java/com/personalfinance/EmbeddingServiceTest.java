package com.personalfinance;

import com.personalfinance.infrastructure.vector.EmbeddingService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EmbeddingServiceTest {

    @Test
    void testEmbeddingDimensionAndNormalization() {
        EmbeddingService service = new EmbeddingService();
        float[] vector = service.embed("Receipt from Starbucks Coffee for $14.85 on 2026-08-18");

        assertNotNull(vector);
        assertEquals(768, vector.length);

        // Verify unit vector normalization (L2 norm should be approx 1.0)
        double norm = 0.0;
        for (float v : vector) {
            norm += v * v;
        }
        assertEquals(1.0, Math.sqrt(norm), 0.01);
    }

    @Test
    void testSemanticSimilarityBetweenRelatedPhrases() {
        EmbeddingService service = new EmbeddingService();
        float[] v1 = service.embed("Dinner at Italian Restaurant with friends");
        float[] v2 = service.embed("Restaurant dining Italian pasta lunch");
        float[] v3 = service.embed("AWS Cloud Infrastructure invoice subscription");

        double sim12 = cosineSimilarity(v1, v2);
        double sim13 = cosineSimilarity(v1, v3);

        assertTrue(sim12 > sim13, "Related restaurant terms should have higher cosine similarity than cloud infrastructure");
    }

    private double cosineSimilarity(float[] a, float[] b) {
        double dot = 0.0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
        }
        return dot;
    }
}
