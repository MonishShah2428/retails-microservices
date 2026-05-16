package se.magnus.microservices.composite.product.service;

import static org.springframework.http.HttpMethod.GET;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.product.ProductService;
import se.magnus.api.core.recommendation.Recommendation;
import se.magnus.api.core.recommendation.RecommendationService;
import se.magnus.api.core.review.Review;
import se.magnus.api.core.review.ReviewService;
import se.magnus.api.exceptions.InvalidInputException;
import se.magnus.api.exceptions.NotFoundException;
import se.magnus.util.http.HttpErrorInfo;
import tools.jackson.databind.ObjectMapper;

@Component
public class ProductCompositeInteg implements ProductService, RecommendationService, ReviewService {

   private final RestTemplate restTemplate;
   private final ObjectMapper objectMapper;

   private final String productServiceUrl;
   private final String recommendationServiceUrl;
   private final String reviewServiceUrl;

   @Autowired
   public ProductCompositeInteg(RestTemplate restTemplate, ObjectMapper objectMapper,
         @Value("${app.product-service.host}") String productServiceHost,
         @Value("${app.product-service.port}") int productServicePort,
         @Value("${app.recommendation-service.host}") String recommendationServiceHost,
         @Value("${app.recommendation-service.port}") int recommendationServicePort,
         @Value("${app.review-service.host}") String reviewServiceHost,
         @Value("${app.review-service.port}") int reviewServicePort) {

      this.restTemplate = restTemplate;
      this.objectMapper = objectMapper;

      this.productServiceUrl = "http://" + productServiceHost + ":" + productServicePort + "/product/";
      this.recommendationServiceUrl = "http://" + recommendationServiceHost + ":" + recommendationServicePort + "/recommendation?productId=";
      this.reviewServiceUrl = "http://" + reviewServiceHost + ":" + reviewServicePort + "/review?productId=";
   }

   public Product getProduct(int productId) {
      String url = productServiceUrl + productId;
      Product product = restTemplate.getForObject(url, Product.class);
      return product;
   }

   public List<Recommendation> getRecommendations(int productId) {
      String url = recommendationServiceUrl + productId;
      List<Recommendation> recommendations =
      restTemplate.exchange(url, GET, null, new
      ParameterizedTypeReference<List<Recommendation>>()
      {}).getBody();
      return recommendations;
   }

   public List<Review> getReviews(int productId) {
      String url = reviewServiceUrl + productId;
      List<Review> reviews = restTemplate.exchange(url, GET, null,
      new ParameterizedTypeReference<List<Review>>() {}).getBody();
      return reviews;
   }
   
}
