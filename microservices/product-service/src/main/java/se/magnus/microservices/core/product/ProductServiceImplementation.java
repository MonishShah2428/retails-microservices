package se.magnus.microservices.core.product;

import org.springframework.web.bind.annotation.RestController;
import se.magnus.api.core.product.Product;
import se.magnus.api.core.product.ProductService;
import se.magnus.util.http.ServiceUtil;
@RestController
public class ProductServiceImplementation implements ProductService {
    private final ServiceUtil serviceUtil;
    public ProductServiceImplementation(ServiceUtil serviceUtil) {
        this.serviceUtil = serviceUtil;
    }
    @Override
    public Product getProduct(int productId) {
        return new Product(productId, "Name " + productId, 123, serviceUtil.getServiceAddress());
    }
}
