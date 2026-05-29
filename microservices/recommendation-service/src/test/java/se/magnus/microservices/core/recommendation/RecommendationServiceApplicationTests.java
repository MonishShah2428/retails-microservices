package se.magnus.microservices.core.recommendation;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.stream.binder.test.TestChannelBinderConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties={"eureka.client.enabled=false", "spring.cloud.config.enabled=false"})
@Import(TestChannelBinderConfiguration.class)
class RecommendationServiceApplicationTests extends MongoDbTestBase {
	
	@Test
	void contextLoads() {
	}

}
