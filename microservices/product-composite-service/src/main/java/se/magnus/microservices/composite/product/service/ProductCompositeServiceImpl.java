package se.magnus.microservices.composite.product.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import se.magnus.api.composite.product.*;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.review.Review;
import se.magnus.util.http.ServiceUtil;

@RestController
public class ProductCompositeServiceImpl implements ProductCompositeService {

  private static final Logger LOG = LoggerFactory.getLogger(ProductCompositeServiceImpl.class);

  private final ServiceUtil serviceUtil;
  private final ProductCompositeIntegration integration;

  @Autowired
  public ProductCompositeServiceImpl(
    ServiceUtil serviceUtil, ProductCompositeIntegration integration) {
    this.serviceUtil = serviceUtil;
    this.integration = integration;
  }

  @Override
  public Mono<Void> createProduct(ProductAggregate body) {
    LOG.debug("createCompositeProduct: creates a new composite entity for productId: {}", body.productId());

    List<Mono<?>> monoList = new ArrayList<>();
    monoList.add(integration.createProduct(new Product(body.productId(), body.name(), body.weight(), null)));

    if (body.recommendations() != null) {
      body.recommendations().forEach(r ->
        monoList.add(integration.createRecommendation(
          new Recommendation(body.productId(), r.recommendationId(), r.author(), r.rate(), "", null))));
    }

    if (body.reviews() != null) {
      body.reviews().forEach(r ->
        monoList.add(integration.createReview(
          new Review(body.productId(), r.reviewId(), r.author(), r.subject(), "", null))));
    }

    return Mono.when(monoList)
      .doOnError(ex -> LOG.warn("createCompositeProduct failed: {}", ex.toString()));
  }

  @Override
  public Mono<ProductAggregate> getProduct(int productId) {
    LOG.debug("getCompositeProduct: lookup a product aggregate for productId: {}", productId);

    return Mono.zip(
        integration.getProduct(productId),
        integration.getRecommendations(productId).collectList(),
        integration.getReviews(productId).collectList())
      .map(tuple -> createProductAggregate(
        tuple.getT1(), tuple.getT2(), tuple.getT3(), serviceUtil.getServiceAddress()))
      .doOnError(ex -> LOG.warn("getCompositeProduct failed: {}", ex.toString()));
  }

  @Override
  public Mono<Void> deleteProduct(int productId) {
    LOG.debug("deleteCompositeProduct: Deletes a product aggregate for productId: {}", productId);

    return Mono.when(
        integration.deleteProduct(productId),
        integration.deleteRecommendations(productId),
        integration.deleteReviews(productId))
      .doOnError(ex -> LOG.warn("deleteCompositeProduct failed: {}", ex.toString()));
  }

  private ProductAggregate createProductAggregate(
    Product product,
    List<Recommendation> recommendations,
    List<Review> reviews,
    String serviceAddress) {

    int productId = product.productId();
    String name = product.name();
    int weight = product.weight();

    List<RecommendationSummary> recommendationSummaries = (recommendations == null) ? null :
      recommendations.stream()
        .map(r -> new RecommendationSummary(r.recommendationId(), r.author(), r.rate()))
        .collect(Collectors.toList());

    List<ReviewSummary> reviewSummaries = (reviews == null) ? null :
      reviews.stream()
        .map(r -> new ReviewSummary(r.reviewId(), r.author(), r.subject()))
        .collect(Collectors.toList());

    String productAddress = product.serviceAddress();
    String reviewAddress = (reviews != null && reviews.size() > 0) ? reviews.get(0).serviceAddress() : "";
    String recommendationAddress = (recommendations != null && recommendations.size() > 0) ? recommendations.get(0).serviceAddress() : "";
    ServiceAddresses serviceAddresses = new ServiceAddresses(serviceAddress, productAddress, reviewAddress, recommendationAddress);

    return new ProductAggregate(productId, name, weight, recommendationSummaries, reviewSummaries, serviceAddresses);
  }
}
