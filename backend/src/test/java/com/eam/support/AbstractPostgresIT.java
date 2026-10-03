package com.eam.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Base for DB-backed tests. One shared PostGIS container per JVM. The bootstrap user is the
 * Flyway admin (superuser); the application connects as the non-superuser eam_runtime role so
 * RLS actually applies. Never point the app at the admin user: superusers bypass RLS and every
 * isolation test would pass for the wrong reason.
 */
@SpringBootTest
public abstract class AbstractPostgresIT {

    public static final String ADMIN_USER = "eam_test_admin";
    public static final String ADMIN_PASSWORD = "eam_admin";
    public static final String RUNTIME_USER = "eam_runtime";
    public static final String RUNTIME_PASSWORD = "eam_runtime_pw";
    public static final String LOGIN_USER = "eam_login_lookup";
    public static final String LOGIN_PASSWORD = "eam_login";

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("eam_test")
            .withUsername(ADMIN_USER)
            .withPassword(ADMIN_PASSWORD);

    static {
        POSTGRES.start();
    }

    public static String jdbcUrl() {
        return "jdbc:postgresql://" + POSTGRES.getHost() + ":" + POSTGRES.getMappedPort(5432)
                + "/eam_test?currentSchema=eam";
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", AbstractPostgresIT::jdbcUrl);
        registry.add("spring.datasource.username", () -> RUNTIME_USER);
        registry.add("spring.datasource.password", () -> RUNTIME_PASSWORD);
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "5");
        registry.add("spring.flyway.url", AbstractPostgresIT::jdbcUrl);
        registry.add("spring.flyway.user", () -> ADMIN_USER);
        registry.add("spring.flyway.password", () -> ADMIN_PASSWORD);
        registry.add("spring.flyway.placeholders.runtime_password", () -> RUNTIME_PASSWORD);
        registry.add("spring.flyway.placeholders.login_lookup_password", () -> LOGIN_PASSWORD);
    }

    public static Connection adminConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), ADMIN_USER, ADMIN_PASSWORD);
    }

    public static Connection loginLookupConnection() throws SQLException {
        return DriverManager.getConnection(jdbcUrl(), LOGIN_USER, LOGIN_PASSWORD);
    }

    /** Autocommit off; applies SET LOCAL app.current_tenant when tenantId is non-null. */
    public static Connection runtimeConnection(UUID tenantId) throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(), RUNTIME_USER, RUNTIME_PASSWORD);
        connection.setAutoCommit(false);
        if (tenantId != null) {
            try (Statement statement = connection.createStatement()) {
                statement.execute("SET LOCAL app.current_tenant = '" + tenantId + "'");
            }
        }
        return connection;
    }
}
