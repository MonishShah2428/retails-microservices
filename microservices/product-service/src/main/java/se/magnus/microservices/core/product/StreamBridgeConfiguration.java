package se.magnus.microservices.core.product;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.core.convert.support.GenericConversionService;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class StreamBridgeConfiguration {

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
}
