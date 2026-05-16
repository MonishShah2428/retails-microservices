package se.magnus.microservices.composite.product.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.RestController;

import se.magnus.api.composite.product.ProductAggregate;
import se.magnus.api.composite.product.ProductCompositeService;
import se.magnus.api.composite.product.RecommendationSummary;
import se.magnus.api.composite.product.ReviewSummary;
import se.magnus.api.composite.product.ServiceAddresses;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.review.Review;
import se.magnus.util.http.ServiceUtil;

@RestController
public class ProductCompositeServiceImpl implements ProductCompositeService {
    private final ProductCompositeInteg integ;
    private final ServiceUtil serviceUtil;

    public ProductCompositeServiceImpl(ProductCompositeInteg integ, ServiceUtil serviceUtil) {
        this.integ = integ;
        this.serviceUtil = serviceUtil;
    }

    @Override
    public ProductAggregate getProduct(int productId) {
        Product product = integ.getProduct(productId);
        List<Recommendation> recommendations = integ.getRecommendations(productId);
        List<Review> reviews = integ.getReviews(productId);
        
        return createProductAggregate(product, recommendations, reviews, serviceUtil.getServiceAddress());
    }
    private ProductAggregate createProductAggregate(
        Product product,
        List<Recommendation> recommendations,
        List<Review> reviews,
        String serviceAddress) {

        // 1. Setup product info
        int productId = product.productId();
        String name = product.name();
        int weight = product.weight();

        // 2. Copy summary recommendation info, if available
        List<RecommendationSummary> recommendationSummaries =
        (recommendations == null) ? null : recommendations.stream()
            .map(r -> new RecommendationSummary(r.recommendationId(), r.author(), r.rate()))
            .collect(Collectors.toList());

        // 3. Copy summary review info, if available
        List<ReviewSummary> reviewSummaries = 
        (reviews == null) ? null : reviews.stream()
            .map(r -> new ReviewSummary(r.reviewId(), r.author(), r.subject()))
            .collect(Collectors.toList());

        // 4. Create info regarding the involved microservices addresses
        String productAddress = product.serviceAddress();
        String reviewAddress = (reviews != null && reviews.size() > 0) ? reviews.get(0).serviceAddress() : "";
        String recommendationAddress = (recommendations != null && recommendations.size() > 0) ? recommendations.get(0).serviceAddress() : "";
        ServiceAddresses serviceAddresses = new ServiceAddresses(serviceAddress, productAddress, reviewAddress, recommendationAddress);

        return new ProductAggregate(productId, name, weight, recommendationSummaries, reviewSummaries, serviceAddresses);
    }
}
