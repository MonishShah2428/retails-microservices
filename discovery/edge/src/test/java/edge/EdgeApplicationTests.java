package edge;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "eureka.client.enabled=false",
        "spring.cloud.config.enabled=false",
        "server.ssl.enabled=false"
    }
)
class EdgeApplicationTests {

	@Test
	void contextLoads() {
	}

}
