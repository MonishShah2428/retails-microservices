package se.magnus.microservices.core.product;

import static java.util.stream.IntStream.rangeClosed;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.data.domain.Sort.Direction.ASC;

import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import reactor.test.StepVerifier;
import se.magnus.microservices.core.product.persistence.ProductEntity;
import se.magnus.microservices.core.product.persistence.ProductRepository;

@DataMongoTest(properties = "spring.mongodb.auto-index-creation=true")
class PersistenceTests extends MongoDbTestBase {

  @Autowired
  private ProductRepository repository;

  private ProductEntity savedEntity;

  @BeforeEach
  void setupDb() {
    repository.deleteAll().block();

    ProductEntity entity = new ProductEntity(1, "n", 1);
    savedEntity = repository.save(entity).block();

    assertEqualsProduct(entity, savedEntity);
  }

  @Test
  void create() {
    ProductEntity newEntity = new ProductEntity(2, "n", 2);
    repository.save(newEntity).block();

    ProductEntity foundEntity = repository.findById(newEntity.getId()).block();
    assertEqualsProduct(newEntity, foundEntity);

    assertEquals(2, repository.count().block());
  }

  @Test
  void update() {
    savedEntity.setName("n2");
    repository.save(savedEntity).block();

    ProductEntity foundEntity = repository.findById(savedEntity.getId()).block();
    assertEquals(1, (long) foundEntity.getVersion());
    assertEquals("n2", foundEntity.getName());
  }

  @Test
  void delete() {
    repository.delete(savedEntity).block();
    assertFalse(repository.existsById(savedEntity.getId()).block());
  }

  @Test
  void getByProductId() {
    ProductEntity entity = repository.findByProductId(savedEntity.getProductId()).block();

    assertNotNull(entity);
    assertEqualsProduct(savedEntity, entity);
  }

  @Test
  void duplicateError() {
    StepVerifier.create(repository.save(new ProductEntity(savedEntity.getProductId(), "n", 1)))
      .expectError(DuplicateKeyException.class)
      .verify();
  }

  @Test
  void optimisticLockError() {
    ProductEntity entity1 = repository.findById(savedEntity.getId()).block();
    ProductEntity entity2 = repository.findById(savedEntity.getId()).block();

    entity1.setName("n1");
    repository.save(entity1).block();

    entity2.setName("n2");
    StepVerifier.create(repository.save(entity2))
      .expectError(OptimisticLockingFailureException.class)
      .verify();

    ProductEntity updatedEntity = repository.findById(savedEntity.getId()).block();
    assertEquals(1, (int) updatedEntity.getVersion());
    assertEquals("n1", updatedEntity.getName());
  }

  @Test
  void paging() {
    repository.deleteAll().block();

    List<ProductEntity> newProducts = rangeClosed(1001, 1010)
      .mapToObj(i -> new ProductEntity(i, "name " + i, i))
      .collect(Collectors.toList());
    repository.saveAll(newProducts).collectList().block();

    Pageable nextPage = PageRequest.of(0, 4, ASC, "productId");
    nextPage = testNextPage(nextPage, "[1001, 1002, 1003, 1004]", true);
    nextPage = testNextPage(nextPage, "[1005, 1006, 1007, 1008]", true);
             testNextPage(nextPage, "[1009, 1010]", false);
  }

  private Pageable testNextPage(Pageable nextPage, String expectedProductIds, boolean expectsNextPage) {
    List<ProductEntity> products = repository.findAllBy(nextPage).collectList().block();
    assertEquals(
      expectedProductIds,
      products.stream().map(p -> p.getProductId()).collect(Collectors.toList()).toString()
    );
    assertEquals(expectsNextPage, products.size() == nextPage.getPageSize());
    return nextPage.next();
  }

  private void assertEqualsProduct(ProductEntity expectedEntity, ProductEntity actualEntity) {
    assertEquals(expectedEntity.getId(),        actualEntity.getId());
    assertEquals(expectedEntity.getVersion(),   actualEntity.getVersion());
    assertEquals(expectedEntity.getProductId(), actualEntity.getProductId());
    assertEquals(expectedEntity.getName(),      actualEntity.getName());
    assertEquals(expectedEntity.getWeight(),    actualEntity.getWeight());
  }
}
