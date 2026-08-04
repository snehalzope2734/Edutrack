package com.edutrack.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.edutrack.repository.mongodb")
public class MongoConfig {
    // Connection is configured via spring.data.mongodb.uri in application properties.
    // Spring Boot auto-configures the MongoTemplate/MongoClient from that URI.
}
