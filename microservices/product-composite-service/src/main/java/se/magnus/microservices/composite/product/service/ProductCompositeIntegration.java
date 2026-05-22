package se.magnus.microservices.composite.product.service;

import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.product.ProductService;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.recommendation.RecommendationService;
import se.magnus.api.core.review.Review;
import se.magnus.api.core.review.ReviewService;
import se.magnus.api.exceptions.InvalidInputException;
import se.magnus.api.exceptions.NotFoundException;
import se.magnus.util.http.HttpErrorInfo;

@Component
public class ProductCompositeIntegration implements ProductService, RecommendationService, ReviewService {

  private static final Logger LOG = LoggerFactory.getLogger(ProductCompositeIntegration.class);

  private final WebClient webClient;
  private final ObjectMapper mapper;
  private final String productServiceUrl;
  private final String recommendationServiceUrl;
  private final String reviewServiceUrl;

  public ProductCompositeIntegration(
    WebClient.Builder webClientBuilder,
    ObjectMapper mapper,
    @Value("${app.product-service.host}") String productServiceHost,
    @Value("${app.product-service.port}") int productServicePort,
    @Value("${app.recommendation-service.host}") String recommendationServiceHost,
    @Value("${app.recommendation-service.port}") int recommendationServicePort,
    @Value("${app.review-service.host}") String reviewServiceHost,
    @Value("${app.review-service.port}") int reviewServicePort) {

    this.webClient = webClientBuilder.build();
    this.mapper = mapper;

    productServiceUrl = "http://" + productServiceHost + ":" + productServicePort + "/product";
    recommendationServiceUrl = "http://" + recommendationServiceHost + ":" + recommendationServicePort + "/recommendation";
    reviewServiceUrl = "http://" + reviewServiceHost + ":" + reviewServicePort + "/review";
  }

  @Override
  public Mono<Product> createProduct(Product body) {
    LOG.debug("createProduct: creates a new product entity for productId: {}", body.productId());
    return webClient.post()
      .uri(productServiceUrl)
      .bodyValue(body)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Product.class)
      .doOnNext(p -> LOG.debug("createProduct: created a product entity for productId: {}", p.productId()));
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
    String url = productServiceUrl + "/" + productId;
    LOG.debug("Will call the deleteProduct API on URL: {}", url);
    return webClient.delete()
      .uri(url)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Void.class);
  }

  @Override
  public Mono<Recommendation> createRecommendation(Recommendation body) {
    LOG.debug("Will post a new recommendation to URL: {}", recommendationServiceUrl);
    return webClient.post()
      .uri(recommendationServiceUrl)
      .bodyValue(body)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Recommendation.class)
      .doOnNext(r -> LOG.debug("Created a recommendation with id: {}", r.recommendationId()));
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
    String url = recommendationServiceUrl + "?productId=" + productId;
    LOG.debug("Will call the deleteRecommendations API on URL: {}", url);
    return webClient.delete()
      .uri(url)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Void.class);
  }

  @Override
  public Mono<Review> createReview(Review body) {
    LOG.debug("Will post a new review to URL: {}", reviewServiceUrl);
    return webClient.post()
      .uri(reviewServiceUrl)
      .bodyValue(body)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Review.class)
      .doOnNext(r -> LOG.debug("Created a review with id: {}", r.reviewId()));
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
    String url = reviewServiceUrl + "?productId=" + productId;
    LOG.debug("Will call the deleteReviews API on URL: {}", url);
    return webClient.delete()
      .uri(url)
      .retrieve()
      .onStatus(HttpStatusCode::isError, this::handleError)
      .bodyToMono(Void.class);
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
