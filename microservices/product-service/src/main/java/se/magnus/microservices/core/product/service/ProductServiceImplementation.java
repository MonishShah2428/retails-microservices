package se.magnus.microservices.core.product.service;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Mono;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.product.ProductService;
import se.magnus.api.exceptions.InvalidInputException;
import se.magnus.api.exceptions.NotFoundException;
import se.magnus.microservices.core.product.persistence.ProductEntity;
import se.magnus.microservices.core.product.persistence.ProductRepository;
import se.magnus.util.http.ServiceUtil;

@RestController
public class ProductServiceImplementation implements ProductService {

    private static final Logger LOG = LoggerFactory.getLogger(ProductServiceImplementation.class);

    private final ServiceUtil serviceUtil;

    private final ProductRepository repository;

    private final ProductMapper mapper;

    public ProductServiceImplementation(ServiceUtil serviceUtil, ProductRepository repository, ProductMapper mapper) {
        this.serviceUtil = serviceUtil;
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
  public Mono<Product> createProduct(Product body) {
    return repository.save(mapper.apiToEntity(body))
      .map(e -> {
        LOG.debug("createProduct: entity created for productId: {}", body.productId());
        return mapper.entityToApi(e);
      })
      .onErrorMap(DuplicateKeyException.class, ex -> new InvalidInputException("Duplicate key, Product Id: " + body.productId()));
  }

  @Override
  public Mono<Product> getProduct(int productId, int delay, int faultPercent) {
    if (productId < 1) {
      throw new InvalidInputException("Invalid productId: " + productId);
    }
    return repository.findByProductId(productId)
      .switchIfEmpty(Mono.error(new NotFoundException("No product found for productId: " + productId)))
      .map(e -> throwErrorIfBadLuck(e, faultPercent))
      .delayElement(Duration.ofSeconds(delay))
      .map(mapper::entityToApi)
      .map(e -> new Product(e.productId(), e.name(), e.weight(), serviceUtil.getServiceAddress()));
  }

  @Override
  public Mono<Void> deleteProduct(int productId) {
    LOG.debug("deleteProduct: tries to delete an entity with productId: {}", productId);
    return repository.findByProductId(productId)
      .flatMap(repository::delete);
  }

  private ProductEntity throwErrorIfBadLuck(ProductEntity entity, int faultPercent) {
    if(faultPercent ==0) return entity;
    int random = (int) (Math.random() * 100) + 1;
    if (random <= faultPercent) {
      LOG.debug("Random value {} <= faultPercent {}, throwing error", random, faultPercent);
      throw new RuntimeException("Bad luck!");
    }
    LOG.debug("Random value {} > faultPercent {}, no error", random, faultPercent);
    return entity;
  }
}
