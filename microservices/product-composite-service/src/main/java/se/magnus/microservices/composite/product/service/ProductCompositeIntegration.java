package se.magnus.microservices.composite.product.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.http.HttpStatusCode;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.product.ProductService;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.recommendation.RecommendationService;
import se.magnus.api.core.review.Review;
import se.magnus.api.core.review.ReviewService;
import se.magnus.api.event.Event;
import se.magnus.api.exceptions.InvalidInputException;
import se.magnus.api.exceptions.NotFoundException;
import se.magnus.util.http.HttpErrorInfo;

import java.util.logging.Level;

import static se.magnus.api.event.Event.Type.CREATE;
import static se.magnus.api.event.Event.Type.DELETE;

@Component
public class ProductCompositeIntegration implements ProductService, RecommendationService, ReviewService {

  private static final Logger LOG = LoggerFactory.getLogger(ProductCompositeIntegration.class);

  private final WebClient webClient;
  private final ObjectMapper mapper;
  private final StreamBridge streamBridge;
  private final Scheduler publishEventScheduler;
  private final String productServiceUrl;
  private final String recommendationServiceUrl;
  private final String reviewServiceUrl;
  private final String productServiceHealthUrl;
  private final String recommendationServiceHealthUrl;
  private final String reviewServiceHealthUrl;

  public ProductCompositeIntegration(
    WebClient.Builder webClientBuilder,
    ObjectMapper mapper,
    StreamBridge streamBridge,
    Scheduler publishEventScheduler,
    @Value("${app.product-service.host}") String productServiceHost,
    @Value("${app.product-service.port}") int productServicePort,
    @Value("${app.recommendation-service.host}") String recommendationServiceHost,
    @Value("${app.recommendation-service.port}") int recommendationServicePort,
    @Value("${app.review-service.host}") String reviewServiceHost,
    @Value("${app.review-service.port}") int reviewServicePort) {

    this.webClient = webClientBuilder.build();
    this.mapper = mapper;
    this.streamBridge = streamBridge;
    this.publishEventScheduler = publishEventScheduler;

    productServiceUrl        = "http://" + productServiceHost        + ":" + productServicePort        + "/product";
    recommendationServiceUrl = "http://" + recommendationServiceHost + ":" + recommendationServicePort + "/recommendation";
    reviewServiceUrl         = "http://" + reviewServiceHost         + ":" + reviewServicePort         + "/review";

    productServiceHealthUrl        = "http://" + productServiceHost        + ":" + productServicePort;
    recommendationServiceHealthUrl = "http://" + recommendationServiceHost + ":" + recommendationServicePort;
    reviewServiceHealthUrl         = "http://" + reviewServiceHost         + ":" + reviewServicePort;
  }

  @Override
  public Mono<Product> createProduct(Product body) {
    return Mono.fromCallable(() -> {
      sendMessage("products-out-0", new Event<>(CREATE, body.productId(), body));
      return body;
    }).subscribeOn(publishEventScheduler);
  }

  @Override
  public Mono<Product> getProduct(int productId) {
    String url = productServiceUrl + "/" + productId;
    LOG.debug("Will call the getProduct API on URL: {}", url);
    return webClient.get()
      .uri(url)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Product.class)
      .doOnNext(p -> LOG.debug("Found a product with id: {}", p.productId()));
  }

  @Override
  public Mono<Void> deleteProduct(int productId) {
    return Mono.fromRunnable(() ->
      sendMessage("products-out-0", new Event<>(DELETE, productId, null)))
      .subscribeOn(publishEventScheduler)
      .then();
  }

  @Override
  public Mono<Recommendation> createRecommendation(Recommendation body) {
    return Mono.fromCallable(() -> {
      sendMessage("recommendations-out-0", new Event<>(CREATE, body.productId(), body));
      return body;
    }).subscribeOn(publishEventScheduler);
  }

  @Override
  public Flux<Recommendation> getRecommendations(int productId) {
    String url = recommendationServiceUrl + "?productId=" + productId;
    LOG.debug("Will call the getRecommendations API on URL: {}", url);
    return webClient.get()
      .uri(url)
      .retrieve()
      .bodyToFlux(Recommendation.class)
      .onErrorResume(ex -> {
        LOG.warn("Got an exception while requesting recommendations, return zero recommendations: {}", ex.getMessage());
        return Flux.empty();
      });
  }

  @Override
  public Mono<Void> deleteRecommendations(int productId) {
    return Mono.fromRunnable(() ->
      sendMessage("recommendations-out-0", new Event<>(DELETE, productId, null)))
      .subscribeOn(publishEventScheduler)
      .then();
  }

  @Override
  public Mono<Review> createReview(Review body) {
    return Mono.fromCallable(() -> {
      sendMessage("reviews-out-0", new Event<>(CREATE, body.productId(), body));
      return body;
    }).subscribeOn(publishEventScheduler);
  }

  @Override
  public Flux<Review> getReviews(int productId) {
    String url = reviewServiceUrl + "?productId=" + productId;
    LOG.debug("Will call the getReviews API on URL: {}", url);
    return webClient.get()
      .uri(url)
      .retrieve()
      .bodyToFlux(Review.class)
      .onErrorResume(ex -> {
        LOG.warn("Got an exception while requesting reviews, return zero reviews: {}", ex.getMessage());
        return Flux.empty();
      });
  }

  @Override
  public Mono<Void> deleteReviews(int productId) {
    return Mono.fromRunnable(() ->
      sendMessage("reviews-out-0", new Event<>(DELETE, productId, null)))
      .subscribeOn(publishEventScheduler)
      .then();
  }

  public Mono<Health> getProductHealth() {
    return getHealth(productServiceHealthUrl);
  }

  public Mono<Health> getRecommendationHealth() {
    return getHealth(recommendationServiceHealthUrl);
  }

  public Mono<Health> getReviewHealth() {
    return getHealth(reviewServiceHealthUrl);
  }

  private Mono<Health> getHealth(String url) {
    url += "/actuator/health";
    LOG.debug("Will call the Health API on URL: {}", url);
    return webClient.get().uri(url).retrieve().bodyToMono(String.class)
      .map(s -> new Health.Builder().up().build())
      .onErrorResume(ex -> Mono.just(new Health.Builder().down(ex).build()))
      .log(LOG.getName(), Level.FINE);
  }

  private void sendMessage(String bindingName, Event<?, ?> event) {
    LOG.debug("Sending a {} message to {}", event.getType(), bindingName);
    Message<?> message = MessageBuilder.withPayload(event)
      .setHeader("partitionKey", event.getKey())
      .build();
    streamBridge.send(bindingName, message);
  }

  private Mono<Throwable> handleError(ClientResponse response) {
    return response.bodyToMono(String.class)
      .defaultIfEmpty("")
      .map(body -> {
        try {
          String message = mapper.readValue(body, HttpErrorInfo.class).getMessage();
          if (response.statusCode().value() == 404) {
            return (Throwable) new NotFoundException(message);
          } else if (response.statusCode().value() == 422) {
            return (Throwable) new InvalidInputException(message);
          }
          LOG.warn("Got an unexpected HTTP error: {}, will rethrow it", response.statusCode());
          return (Throwable) new RuntimeException(message);
        } catch (Exception e) {
          return (Throwable) new RuntimeException(body);
        }
      });
  }
}
