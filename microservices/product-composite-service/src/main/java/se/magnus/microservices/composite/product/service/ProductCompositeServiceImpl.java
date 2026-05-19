package se.magnus.microservices.composite.product.service;

import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RestController;
import se.magnus.api.composite.product.*;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.review.Review;
import se.magnus.api.exceptions.NotFoundException;
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
  public void createProduct(ProductAggregate body) {
    try {
      LOG.debug("createCompositeProduct: creates a new composite entity for productId: {}", body.productId());

      integration.createProduct(new Product(body.productId(), body.name(), body.weight(), null));

      if (body.recommendations() != null) {
        body.recommendations().forEach(r ->
          integration.createRecommendation(new Recommendation(body.productId(), r.recommendationId(), r.author(), r.rate(), "", null)));
      }

      if (body.reviews() != null) {
        body.reviews().forEach(r ->
          integration.createReview(new Review(body.productId(), r.reviewId(), r.author(), r.subject(), "", null)));
      }

      LOG.debug("createCompositeProduct: composite entities created for productId: {}", body.productId());

    } catch (RuntimeException re) {
      LOG.warn("createCompositeProduct failed", re);
      throw re;
    }
  }

  @Override
  public ProductAggregate getProduct(int productId) {
    LOG.debug("getCompositeProduct: lookup a product aggregate for productId: {}", productId);

    Product product = integration.getProduct(productId);
    if (product == null) {
      throw new NotFoundException("No product found for productId: " + productId);
    }

    List<Recommendation> recommendations = integration.getRecommendations(productId);
    List<Review> reviews = integration.getReviews(productId);

    LOG.debug("getCompositeProduct: aggregate entity found for productId: {}", productId);

    return createProductAggregate(product, recommendations, reviews, serviceUtil.getServiceAddress());
  }

  @Override
  public void deleteProduct(int productId) {
    LOG.debug("deleteCompositeProduct: Deletes a product aggregate for productId: {}", productId);

    integration.deleteProduct(productId);
    integration.deleteRecommendations(productId);
    integration.deleteReviews(productId);

    LOG.debug("deleteCompositeProduct: aggregate entities deleted for productId: {}", productId);
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
