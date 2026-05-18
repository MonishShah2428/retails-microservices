package se.magnus.microservices.core.recommendation;

import org.testcontainers.mongodb.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection; 


public abstract class MongoDbTestBase {
    @ServiceConnection
    private static MongoDBContainer database = new MongoDBContainer(DockerImageName.parse("mongo:6.0.4"));
    
    static {
        database.start();
    } 
}
