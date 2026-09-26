package com.personalfinance.ai.gemini;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class GeminiClient {

    private static final Logger LOG = Logger.getLogger(GeminiClient.class);
    private static final String GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    @ConfigProperty(name = "gemini.api-key", defaultValue = "")
    Optional<String> configuredApiKey = Optional.empty();

    @ConfigProperty(name = "gemini.model.chat", defaultValue = "gemini-3.5-flash-lite")
    String modelName = "gemini-3.5-flash-lite";

    @ConfigProperty(name = "gemini.temperature", defaultValue = "0.2")
    double temperature = 0.2;

    @Inject
    Tracer tracer;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Resolves the active Gemini API key from (1) application.properties, (2) System environment,
     * or (3) .env file in current, parent, or backend directories.
     */
    public String getEffectiveApiKey() {
        // 1. Configured via Quarkus config
        if (configuredApiKey != null && configuredApiKey.isPresent() && !configuredApiKey.get().isBlank() && !configuredApiKey.get().equals("mock-key")) {
            return cleanKey(configuredApiKey.get());
        }

        // 2. System Environment variable
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.isBlank() && !envKey.equals("mock-key")) {
            return cleanKey(envKey);
        }

        // 3. Fallback: Parse .env files directly from disk
        Path[] envPaths = new Path[]{
                Paths.get(".env"),
                Paths.get("../.env"),
                Paths.get("backend/.env"),
                Paths.get(System.getProperty("user.dir"), ".env"),
                Paths.get(System.getProperty("user.dir"), "../.env")
        };

        for (Path p : envPaths) {
            try {
                if (Files.exists(p)) {
                    List<String> lines = Files.readAllLines(p);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.startsWith("GEMINI_API_KEY=") || trimmed.startsWith("export GEMINI_API_KEY=")) {
                            String val = trimmed.substring(trimmed.indexOf('=') + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (!val.isBlank() && !val.equals("mock-key")) {
                                return val;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private String cleanKey(String raw) {
        if (raw == null) return null;
        String val = raw.trim();
        while ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length() - 1).trim();
        }
        return val.replaceAll("[^a-zA-Z0-9_.-]", "");
    }

    public boolean isConfigured() {
        String key = getEffectiveApiKey();
        return key != null && !key.isBlank() && !key.equals("mock-key");
    }

    public String generateAdvice(String systemInstruction, String userPrompt, String financialContext) {
        String key = getEffectiveApiKey();
        boolean hasKey = (key != null && !key.isBlank());

        Span span = null;
        if (tracer != null) {
            span = tracer.spanBuilder("GeminiClient.generateAdvice")
                    .setAttribute("gemini.model", modelName)
                    .setAttribute("gemini.has_key", hasKey)
                    .startSpan();
        }

        try {
            if (!hasKey) {
                LOG.info("GEMINI_API_KEY is not configured or in mock mode. Using built-in intelligent financial counselor.");
                return null;
            }

            // Primary model (Gemini 3.5 Flash Lite)
            String primaryModel = (modelName != null && !modelName.isBlank()) ? modelName : "gemini-3.5-flash-lite";
            String result = callModel(primaryModel, key, systemInstruction, userPrompt, financialContext);
            if (result != null && !result.isBlank()) {
                return result;
            }

            // Fallback candidate if primary returns temporary 503
            String fallbackModel = primaryModel.equals("gemini-3.5-flash-lite") ? "gemini-3.5-flash" : "gemini-3.5-flash-lite";
            return callModel(fallbackModel, key, systemInstruction, userPrompt, financialContext);
        } catch (Exception e) {
            if (span != null) span.recordException(e);
            LOG.errorf(e, "Error calling Google Gemini API");
        } finally {
            if (span != null) span.end();
        }
        return null;
    }

    private String callModel(String model, String key, String systemInstruction, String userPrompt, String financialContext) {
        try {
            String url = String.format(GEMINI_API_ENDPOINT, model) + "?key=" + key;

            ObjectNode rootNode = objectMapper.createObjectNode();

            // 1. System Instruction
            ObjectNode sysInstructionNode = rootNode.putObject("systemInstruction");
            ArrayNode sysParts = sysInstructionNode.putArray("parts");
            sysParts.addObject().put("text", systemInstruction + "\n\n### DADOS FINANCEIROS REAIS DO USUÁRIO (2026):\n" + financialContext);

            // 2. User Content
            ArrayNode contentsArray = rootNode.putArray("contents");
            ObjectNode userContent = contentsArray.addObject();
            userContent.put("role", "user");
            ArrayNode userParts = userContent.putArray("parts");
            userParts.addObject().put("text", userPrompt);

            // 3. Generation Config
            ObjectNode genConfig = rootNode.putObject("generationConfig");
            genConfig.put("temperature", temperature);
            genConfig.put("maxOutputTokens", 2048);

            String requestBody = objectMapper.writeValueAsString(rootNode);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode resNode = objectMapper.readTree(response.body());
                JsonNode candidates = resNode.get("candidates");
                if (candidates != null && candidates.isArray() && !candidates.isEmpty()) {
                    JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                    if (!textNode.isMissingNode()) {
                        String generatedText = textNode.asText();
                        LOG.infof("Successfully received response from Google Gemini model %s (%d characters)", model, generatedText.length());
                        return generatedText;
                    }
                }
            } else {
                LOG.warnf("Google Gemini API for model %s responded with status %d: %s", model, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            LOG.warnf("Error calling Gemini model %s: %s", model, e.getMessage());
        }
        return null;
    }

    public java.util.Map<String, Object> testConnection() {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("model", modelName);

        String key = getEffectiveApiKey();
        boolean hasKey = (key != null && !key.isBlank());
        result.put("configured", hasKey);

        if (!hasKey) {
            result.put("status", "NO_KEY_CONFIGURED");
            result.put("message", "GEMINI_API_KEY was not found in .env, application.properties, or environment variables.");
            return result;
        }

        try {
            long start = System.currentTimeMillis();
            String reply = generateAdvice("Responda apenas: Conexão OK.", "Teste de conexão", "{}");
            long latency = System.currentTimeMillis() - start;

            if (reply != null && !reply.isBlank()) {
                result.put("status", "CONNECTED");
                result.put("latencyMs", latency);
                result.put("sampleReply", reply.trim());
                result.put("message", "Google Gemini API key is valid and connected!");
            } else {
                result.put("status", "FAILED");
                result.put("message", "Failed to receive response from Gemini API. Check if your API key is valid.");
            }
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
        }
        return result;
    }
}
