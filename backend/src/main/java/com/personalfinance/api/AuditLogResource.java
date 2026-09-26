package com.personalfinance.api;

import com.personalfinance.infrastructure.eventstore.EventEnvelope;
import com.personalfinance.infrastructure.eventstore.EventStore;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

@Path("/api/audit")
@Produces(MediaType.APPLICATION_JSON)
public class AuditLogResource {

    @Inject
    EventStore eventStore;

    @Inject
    Tracer tracer;

    @GET
    @Path("/events")
    @RunOnVirtualThread
    public Response getAuditEvents(
            @HeaderParam("X-Tenant-Id") @DefaultValue("default-user") String tenantId,
            @QueryParam("limit") @DefaultValue("100") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) {

        Span span = tracer.spanBuilder("AuditLog.getEvents").startSpan();
        try {
            List<EventEnvelope> events = eventStore.loadEventEnvelopes(tenantId, limit, offset);
            long totalCount = eventStore.countEvents(tenantId);

            return Response.ok(Map.of(
                    "tenantId", tenantId,
                    "totalEvents", totalCount,
                    "limit", limit,
                    "offset", offset,
                    "events", events
            )).build();
        } catch (Exception e) {
            span.recordException(e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(Map.of("error", e.getMessage())).build();
        } finally {
            span.end();
        }
    }
}
