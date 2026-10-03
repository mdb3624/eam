package com.eam.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    /**
     * Defining this bean makes Spring Boot's DataSource auto-configuration back off, so the
     * pool size is read explicitly here instead of through spring.datasource.hikari binding.
     */
    @Primary
    @Bean(name = "dataSource")
    public DataSource dataSource(
            DataSourceProperties properties,
            @Value("${spring.datasource.hikari.maximum-pool-size:10}") int maximumPoolSize) {
        HikariDataSource raw = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        raw.setMaximumPoolSize(maximumPoolSize);
        return new TenantAwareDataSource(raw);
    }
}
