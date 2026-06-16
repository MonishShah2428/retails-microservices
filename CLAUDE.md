# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

Each service has its own Gradle wrapper. Build from within the service directory:

```bash
# Build a single service (run from service directory)
cd microservices/product-service && ./gradlew build

# Build without tests
cd microservices/product-service && ./gradlew build -x test

# Run tests for a specific service
cd microservices/product-service && ./gradlew test

# Run a single test class
cd microservices/product-service && ./gradlew test --tests "se.magnus.microservices.core.product.PersistenceTests"
```

Services: `microservices/product-service`, `microservices/recommendation-service`, `microservices/review-service`, `microservices/product-composite-service`, `discovery/config`, `discovery/netflix`, `discovery/edge`.

Shared libraries (`api`, `util`) must be built before dependent services when making API changes:
```bash
cd api && ./gradlew build
cd util && ./gradlew build
```

## Running the Full Stack

```bash
# Start all services (requires Docker)
docker-compose up --build -d

# Bring down
docker-compose down
```

Required env vars for docker-compose: `CONFIG_SERVER_ENCRYPT_KEY`, `CONFIG_SERVER_USR`, `CONFIG_SERVER_PWD`.

Services sleep 30s on startup (entrypoint delay) to wait for Config Server and Eureka to become ready.

## Architecture

```
                    ┌──────────────┐
  HTTPS :8443 ───► │  Edge/Gateway │ (Spring Cloud Gateway)
                    └──────┬───────┘
                           │ lb:// routes
                    ┌──────▼───────────────┐
                    │ product-composite    │ :7000/:8080
                    │ (aggregator service) │
                    └──┬──────┬───────┬───┘
            WebClient  │      │       │    StreamBridge (async)
                    reads   reads   reads      writes to RabbitMQ/Kafka
                       │      │       │              │
               ┌───────▼┐ ┌───▼──┐ ┌─▼────┐        │
               │product │ │recom │ │review│        MQ
               │:7001   │ │:7002 │ │:7003 │        │
               └───┬────┘ └──┬───┘ └──┬───┘ ◄──────┘
               MongoDB    MongoDB    MySQL
```

**Discovery layer** (`discovery/`):
- `config` — Spring Cloud Config Server on `:8888`, serves YAML from `config-repo/` directory
- `netflix` — Eureka Server on `:8761` with HTTP Basic auth (`eureka`/`password`)
- `edge` — Spring Cloud Gateway on `:8443` (HTTPS, self-signed cert at `discovery/edge/src/main/resources/keystore/edge.p12`)

**Shared modules** (included via `project(':api')` / `project(':util')`):
- `api/` — service interfaces (`ProductService`, `RecommendationService`, `ReviewService`, `ProductCompositeService`) and DTOs. All core services implement these interfaces directly as `@RestController`.
- `util/` — `GlobalControllerExceptionHandler` (maps `NotFoundException` → 404, `InvalidInputException` → 422), `ServiceUtil`, `HttpErrorInfo`

**Messaging**: CREATE and DELETE operations go through Spring Cloud Stream. `product-composite-service` publishes events via `StreamBridge` to `products-out-0`, `recommendations-out-0`, `reviews-out-0`. Each core service has a `MessageProcessorConfig` with a `Consumer<Event<Integer, T>> messageProcessor()` bean that handles them. RabbitMQ is the default binder; Kafka is configured as an alternative.

**Resilience** (on `product-composite-service` only): Resilience4j `@CircuitBreaker` + `@Retry` + `@TimeLimiter` on `getProduct`. Fallback returns a hardcoded product for all IDs except 13 (which throws `NotFoundException`). Circuit breaker config is in `config-repo/product-composite-service.yml`.

**Distributed tracing**: All services export traces to Zipkin at `:9411` using `micrometer-tracing-bridge-otel` + `opentelemetry-exporter-zipkin`. Trace/span IDs appear in log patterns. Brave bridge is explicitly excluded to avoid conflict.

## Configuration

All runtime config lives in `config-repo/` and is served by the Config Server. Local dev uses `dev-usr`/`dev-pwd` credentials. Each service's `application.yml` only bootstraps config server connectivity; actual ports, DB connections, and stream bindings come from `config-repo/<service-name>.yml`.

Port assignments (local dev): Config=8888, Eureka=8761, Gateway=8443, product-composite=7000, product=7001, recommendation=7002, review=7003.

**Databases**: `product-service` and `recommendation-service` use MongoDB (reactive); `review-service` uses MySQL with JPA/Hibernate (`ddl-auto: update`).

## Profiles

- (default) — local dev, connects to `localhost` for all dependencies
- `docker` — activates inside containers; overrides hostnames to service names (`mongodb`, `mysql`, `rabbitmq`, `eureka`, `config`, `kafka`)

## Testing Notes

- `product-service` and `recommendation-service` tests use `de.flapdoodle.embed.mongo` (embedded MongoDB) — no external DB needed.
- `review-service` persistence tests extend `MySqlTestBase` which requires Testcontainers with a real MySQL.
- `product-composite-service` tests use `spring-cloud-stream-test-binder` to mock messaging without a broker.

## Book Reference Material

The `Microservices-with-Spring-Boot-and-Spring-Cloud-Third-Edition/` directory contains chapter-by-chapter reference code from the textbook this project is based on. It is not part of the active codebase.
