# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

This is a Gradle multi-module project. Use `gradlew.bat` on Windows.

```powershell
# Build everything
./gradlew build

# Build a specific service
./gradlew :microservices:product-service:build

# Run all tests
./gradlew test

# Run tests for a specific service
./gradlew :microservices:product-service:test

# Run a single test class
./gradlew :microservices:product-service:test --tests "com.example.productservice.PersistenceTests"
```

## Running Locally

```powershell
# Start all services via Docker Compose (requires Docker)
docker-compose up

# Start only infrastructure (databases, messaging, tracing)
docker-compose up mongodb mysql rabbitmq zipkin

# Build Docker images for all services first
./gradlew build && docker-compose build
```

Config server must start before the microservices. The `docker-compose.yml` handles this ordering via `depends_on` with health checks.

## Architecture Overview

**Multi-module structure:**
- `api/` — Shared API interfaces and DTOs (consumed by all services)
- `util/` — Shared utilities (error handling, HTTP helpers)
- `microservices/` — Four core services (product, review, recommendation, product-composite)
- `discovery/` — Config server and API gateway
- `config-repo/` — Externalized configuration files served by the config server
- `kubernetes/helm/` — Helm charts for Kubernetes deployment

**Request flow:** Client → Gateway (8443/SSL) → product-composite-service (7000) → [product-service (7001), recommendation-service (7002), review-service (7003)]

**product-composite-service** is the API aggregator. It calls the three core services via WebClient and applies circuit breakers (Resilience4j). Clients should only interact with the composite service or gateway.

## Service Responsibilities

| Service | Port | Database | Notes |
|---------|------|----------|-------|
| product-service | 7001 | MongoDB | Reactive stack |
| recommendation-service | 7002 | MongoDB | Reactive stack |
| review-service | 7003 | MySQL/JPA | Blocking stack |
| product-composite-service | 7000 | None | Aggregator, Resilience4j |
| config-server | 8888 | None | Spring Cloud Config |
| gateway | 8443 | None | SSL, Spring Cloud Gateway |

In Docker, each service listens on port 80 internally.

## Technology Stack

- **Java 21**, Spring Boot 3.4.5, Spring Cloud 2024.0.1
- **Reactive**: Spring WebFlux + MongoDB Reactive for product/recommendation
- **Messaging**: Spring Cloud Stream over RabbitMQ (Kafka is a secondary option in config)
- **Resilience**: Resilience4j circuit breaker + retry + time-limiter on product-composite
- **Tracing**: Micrometer + OpenTelemetry bridge → Zipkin (100% sample rate)
- **API Docs**: SpringDoc OpenAPI / Swagger UI on product-composite
- **DTO Mapping**: MapStruct

## Configuration

All service configuration is centralized in `config-repo/`. Each service pulls config at startup from the config server.

- `config-repo/application.yml` — Global settings (RabbitMQ, Zipkin, graceful shutdown)
- `config-repo/<service-name>.yml` — Per-service overrides (ports, DB, stream bindings)

Local `application.yml` files in each service only contain the config server connection details. They define two profiles:
- `default` — uses `localhost` hostnames
- `docker` — uses Docker service names as hostnames

**Dev credentials** (from `.env`):
```
CONFIG_SERVER_USR=dev-usr
CONFIG_SERVER_PWD=dev-pwd
CONFIG_SERVER_ENCRYPT_KEY=my-very-secure-encrypt-key
```

## Testing Approach

- Embedded MongoDB (Flapdoodle) for MongoDB service tests
- H2 in-memory DB for review-service (MySQL) tests
- Spring Cloud Stream test binder for messaging tests
- Tests disable the config server via `spring.cloud.config.enabled=false` in `src/test/resources/application.yml`

## Kubernetes / Helm

Charts are organized under `kubernetes/helm/`:
- `common/` — Base templates reused across all charts
- `components/` — Individual service charts
- `environments/dev-env/` — Dev overlay with chart dependencies and `values.yaml`
- `environments/prod-env/` — Prod overlay

Deploy to dev:
```powershell
helm upgrade --install retail-dev kubernetes/helm/environments/dev-env
```

The `test-charts.ps1` script in `kubernetes/helm/` can be used to validate Helm chart rendering.
