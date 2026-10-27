package com.eam.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    /**
     * Defining this bean makes Spring Boot's DataSource auto-configuration back off, so
     * spring.datasource.hikari.* is bound explicitly here. destroyMethod closes the wrapped pool.
     */
    @Primary
    @Bean(name = "dataSource", destroyMethod = "close")
    public DataSource dataSource(DataSourceProperties properties, Environment environment) {
        HikariDataSource raw = properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
        Binder.get(environment).bind("spring.datasource.hikari", Bindable.ofInstance(raw));
        return new TenantAwareDataSource(raw);
    }
}
