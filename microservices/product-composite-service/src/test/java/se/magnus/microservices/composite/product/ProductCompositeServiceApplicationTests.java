package se.magnus.microservices.composite.product;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import se.magnus.microservices.composite.product.service.ProductCompositeIntegration;

@SpringBootTest(properties={"eureka.client.enabled=false", "spring.cloud.config.enabled=false"})
class ProductCompositeServiceApplicationTests {

	@MockitoBean
	private ProductCompositeIntegration integration;

	@Test
	void contextLoads() {
	}

}
