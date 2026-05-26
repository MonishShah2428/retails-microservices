package se.magnus.microservices.core.product;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.stream.binder.test.TestChannelBinderConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties={"eureka.client.enabled=false"})
@Import(TestChannelBinderConfiguration.class)
class ProductServiceApplicationTests extends MongoDbTestBase {

	@Test
	void contextLoads() {
	}

}
