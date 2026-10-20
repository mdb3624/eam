package com.eam.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * Separate small pool for the pre-auth lookup role. Deliberately not @Primary and not
 * tenant-aware: the lookup role has a SELECT-only cross-tenant policy and must stay isolated
 * from the runtime pool that JPA and the rest of the app use. No JdbcTemplate bean is exposed for
 * it: a second JdbcTemplate bean would make Spring Boot back off its own, and every later
 * @Autowired JdbcTemplate would silently run as the cross-tenant lookup role.
 */
@Configuration
public class LoginLookupDataSourceConfig {

    @Bean(name = "loginLookupDataSource", destroyMethod = "close")
    public DataSource loginLookupDataSource(DataSourceProperties runtimeProperties,
                                            @Value("${eam.login-lookup.username}") String username,
                                            @Value("${eam.login-lookup.password}") String password) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(runtimeProperties.getUrl());
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        dataSource.setMaximumPoolSize(2);
        dataSource.setPoolName("login-lookup");
        return dataSource;
    }
}
