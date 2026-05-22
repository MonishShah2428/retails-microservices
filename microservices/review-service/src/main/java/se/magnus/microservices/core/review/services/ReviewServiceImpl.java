package se.magnus.microservices.core.review.services;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import se.magnus.api.core.review.Review;
import se.magnus.api.core.review.ReviewService;
import se.magnus.api.exceptions.InvalidInputException;
import se.magnus.microservices.core.review.persistence.ReviewEntity;
import se.magnus.microservices.core.review.persistence.ReviewRepository;
import se.magnus.util.http.ServiceUtil;

@RestController
public class ReviewServiceImpl implements ReviewService {

  private static final Logger LOG = LoggerFactory.getLogger(ReviewServiceImpl.class);

  private final ReviewRepository repository;

  private final ReviewMapper mapper;

  private final ServiceUtil serviceUtil;

  @Autowired
  public ReviewServiceImpl(ReviewRepository repository, ReviewMapper mapper, ServiceUtil serviceUtil) {
    this.repository = repository;
    this.mapper = mapper;
    this.serviceUtil = serviceUtil;
  }

  @Override
  public Mono<Review> createReview(Review body) {
    LOG.debug("trying to create recommendation entity: {}/{}", body.productId(), body.reviewId()); 
    return Mono.fromCallable(() -> {
      ReviewEntity entity = mapper.apiToEntity(body);
      return mapper.entityToApi(repository.save(entity));
    })
    .onErrorMap(DataIntegrityViolationException.class, ex -> new InvalidInputException("Duplicate key, Product Id: " + body.productId() + ", Review Id:" + body.reviewId()))
    .subscribeOn(Schedulers.boundedElastic());
  }

  @Override
  public Flux<Review> getReviews(int productId) {
    LOG.debug("Trying to get reviews for productId: {}", productId);
    if (productId < 1) {
      throw new InvalidInputException("Invalid productId: " + productId);
    }

    return Mono.fromCallable(() -> repository.findByProductId(productId))
      .flatMapMany(Flux::fromIterable)
      .map(mapper::entityToApi)
      .map(e -> new Review(e.productId(), e.reviewId(), e.author(), e.subject(), e.content(), serviceUtil.getServiceAddress()))
      .subscribeOn(Schedulers.boundedElastic());
  }

  @Override
  public Mono<Void> deleteReviews(int productId) {
    LOG.debug("deleteReviews: tries to delete reviews for the product with productId: {}", productId);
    return Mono.fromRunnable(() -> 
      repository.deleteAll(repository.findByProductId(productId)))
      .subscribeOn(Schedulers.boundedElastic())
      .then();
  }
}