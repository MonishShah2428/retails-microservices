package se.magnus.microservices.core.product;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

public abstract class MongoDbTestBase {

  @DynamicPropertySource
  static void setProperties(DynamicPropertyRegistry registry) {
    registry.add("de.flapdoodle.mongodb.embedded.version", () -> "6.0.4");
  }
}
