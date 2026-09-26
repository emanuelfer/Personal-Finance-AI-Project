# Multi-stage build for Quarkus Java backend
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /build

# 1. Cache dependencies
COPY pom.xml ./
RUN mvn dependency:go-offline -B || true

# 2. Build application Fast-JAR
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /work/

# Set non-root user and security permissions
RUN addgroup -S quarkus && adduser -S quarkus -G quarkus
USER quarkus

# Copy the fast-jar distribution
COPY --chown=quarkus:quarkus --from=build /build/target/quarkus-app/lib/ /work/lib/
COPY --chown=quarkus:quarkus --from=build /build/target/quarkus-app/*.jar /work/
COPY --chown=quarkus:quarkus --from=build /build/target/quarkus-app/app/ /work/app/
COPY --chown=quarkus:quarkus --from=build /build/target/quarkus-app/quarkus/ /work/quarkus/

EXPOSE 8080
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager -XX:+UseG1GC -XX:MaxRAMPercentage=75.0"

ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS -jar /work/quarkus-run.jar" ]
