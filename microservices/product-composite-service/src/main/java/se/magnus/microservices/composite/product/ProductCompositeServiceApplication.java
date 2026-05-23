package se.magnus.microservices.composite.product;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.core.convert.support.GenericConversionService;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.scheduler.Scheduler;
import reactor.core.scheduler.Schedulers;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;




@SpringBootApplication
@ComponentScan("se.magnus")
public class ProductCompositeServiceApplication {

	@Value("${api.common.version}")         String apiVersion;
	@Value("${api.common.title}")           String apiTitle;
	@Value("${api.common.description}")     String apiDescription;
	@Value("${api.common.termsOfService}")  String apiTermsOfService;
	@Value("${api.common.license}")         String apiLicense;
	@Value("${api.common.licenseUrl}")      String apiLicenseUrl;
	@Value("${api.common.externalDocDesc}") String apiExternalDocDesc;
	@Value("${api.common.externalDocUrl}")  String apiExternalDocUrl;
	@Value("${api.common.contact.name}")    String apiContactName;
	@Value("${api.common.contact.url}")     String apiContactUrl;
	@Value("${api.common.contact.email}")   String apiContactEmail;

	@Bean
	WebClient.Builder webClientBuilder() {
		return WebClient.builder();
	}

	@Bean("integrationConversionService")
	@ConditionalOnMissingBean(name = "integrationConversionService")
	public GenericConversionService integrationConversionService() {
		return new DefaultConversionService();
	}

	@Bean
	@ConditionalOnMissingBean
	public TaskScheduler taskScheduler() {
		return new ThreadPoolTaskScheduler();
	}

	@Bean
	public Scheduler publishEventScheduler() {
		return Schedulers.newBoundedElastic(10, 10, "publish-pool");
	}

	@Bean
	public OpenAPI getOpenAPIDocumentation(){
		return new OpenAPI()
				.info(new Info().title(apiTitle)
					.description(apiDescription)
					.version(apiVersion)
				.contact(new Contact()
					.name(apiContactName)
					.url(apiContactUrl)
					.email(apiContactEmail))
				.termsOfService(apiTermsOfService)
				.license(new License()
					.name(apiLicense)
					.url(apiLicenseUrl)))
				.externalDocs(new ExternalDocumentation()
					.description(apiExternalDocDesc)
					.url(apiExternalDocUrl));
	}
	public static void main(String[] args) {
		SpringApplication.run(ProductCompositeServiceApplication.class, args);
	}

}

