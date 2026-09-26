package com.personalfinance.api;

import com.personalfinance.ai.agent.FinancialAdvisorService;
import com.personalfinance.api.dto.AdvisorChatRequest;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.Map;

import com.personalfinance.ai.gemini.GeminiClient;
import jakarta.ws.rs.GET;

@Path("/api/advisor")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AdvisorChatResource {

    @Inject
    FinancialAdvisorService advisorService;

    @Inject
    GeminiClient geminiClient;

    @Inject
    Tracer tracer;

    @GET
    @Path("/status")
    @RunOnVirtualThread
    public Response getStatus() {
        return Response.ok(geminiClient.testConnection()).build();
    }

    @POST
    @Path("/chat")
    @RunOnVirtualThread
    public Response chat(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            AdvisorChatRequest request) {

        Span span = tracer.spanBuilder("AdvisorChatResource.chat")
                .setAttribute("tenant.id", tenantId)
                .startSpan();

        try {
            if (request == null || request.message == null || request.message.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST).entity(Map.of("error", "Message cannot be empty")).build();
            }

            FinancialAdvisorService.AdvisorResponse response = advisorService.advise(tenantId, request.message);
            return Response.ok(response).build();
        } catch (Exception e) {
            span.recordException(e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }
}
