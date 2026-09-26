package com.personalfinance.api;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.Map;

@Path("/api/health")
@Produces(MediaType.APPLICATION_JSON)
public class HealthCheckResource {

    @GET
    public Response health() {
        return Response.ok(Map.of(
                "status", "UP",
                "service", "personal-finance-core",
                "timestamp", Instant.now().toString(),
                "cqrs", "ENABLED",
                "eventSourcing", "ACTIVE",
                "virtualThreads", "ENABLED",
                "ragEngine", "READY"
        )).build();
    }
}
