package se.magnus.microservices.composite.product.service;

import static org.springframework.http.HttpMethod.GET;

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

   private static final Logger LOG = LoggerFactory.getLogger(ProductCompositeInteg.class);

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
      try {
         String url = productServiceUrl + productId;
         return restTemplate.getForObject(url, Product.class);
      } catch (HttpClientErrorException ex) {

         switch (HttpStatus.resolve(ex.getStatusCode().value())) {
         case NOT_FOUND:
            throw new NotFoundException(getErrorMessage(ex));

         case UNPROCESSABLE_CONTENT:
            throw new InvalidInputException(getErrorMessage(ex));

         default:
            LOG.warn("Got an unexpected HTTP error: {}, will rethrow it", ex.getStatusCode());
            LOG.warn("Error body: {}", ex.getResponseBodyAsString());
            throw ex;
         }
      }
   }
   private String getErrorMessage(HttpClientErrorException ex) {
      try {
         return objectMapper.readValue(ex.getResponseBodyAsString(), HttpErrorInfo.class).getMessage();
      } catch (Exception ioex) {
         return ex.getMessage();
      }
   }
   public List<Recommendation> getRecommendations(int productId) {
      try {
         String url = recommendationServiceUrl + productId;
         return restTemplate.exchange(url, GET, null,
            new ParameterizedTypeReference<List<Recommendation>>() {}).getBody();
      } catch (HttpClientErrorException ex) {
         LOG.warn("Got an exception while requesting recommendations, return zero recommendations: {}", ex.getMessage());
         return new ArrayList<>();
      }
   }

   public List<Review> getReviews(int productId) {
      try {
         String url = reviewServiceUrl + productId;
         return restTemplate.exchange(url, GET, null,
            new ParameterizedTypeReference<List<Review>>() {}).getBody();
      } catch (HttpClientErrorException ex) {
         LOG.warn("Got an exception while requesting reviews, return zero reviews: {}", ex.getMessage());
         return new ArrayList<>();
      }
   }
   
}
