package se.magnus.microservices.core.product;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.mongodb.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;

public abstract class MongoDbTestBase {
  private static MongoDBContainer database =
      new MongoDBContainer(DockerImageName.parse("mongo:6.0.4"));

  static {
    database.start();
  }

  @DynamicPropertySource
  static void setProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.mongodb.host", database::getHost);
    registry.add("spring.mongodb.port", () -> database.getMappedPort(27017));
    registry.add("spring.mongodb.database", () -> "test");
  }
}
