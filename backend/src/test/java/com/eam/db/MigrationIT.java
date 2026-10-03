package com.eam.db;

import com.eam.support.AbstractPostgresIT;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationIT extends AbstractPostgresIT {

    static void seedTenantWithUser(UUID tenantId, String email) throws SQLException {
        try (Connection admin = adminConnection()) {
            try (PreparedStatement tenant = admin.prepareStatement(
                    "INSERT INTO eam.tenants (id, name) VALUES (?, ?)")) {
                tenant.setObject(1, tenantId);
                tenant.setString(2, "Tenant " + tenantId);
                tenant.executeUpdate();
            }
            try (PreparedStatement user = admin.prepareStatement(
                    "INSERT INTO eam.users (id, tenant_id, email) VALUES (?, ?, ?)")) {
                user.setObject(1, UUID.randomUUID());
                user.setObject(2, tenantId);
                user.setString(3, email);
                user.executeUpdate();
            }
        }
    }

    private static boolean queryBoolean(String sql) throws SQLException {
        try (Connection admin = adminConnection();
             Statement statement = admin.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {
            rs.next();
            return rs.getBoolean(1);
        }
    }

    @Test
    void flywayAppliesAllMigrationsSuccessfully() throws Exception {
        try (Connection admin = adminConnection();
             Statement statement = admin.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT count(*) FILTER (WHERE success), count(*) FROM eam.flyway_schema_history")) {
            rs.next();
            assertThat(rs.getInt(1)).isEqualTo(rs.getInt(2)).isGreaterThanOrEqualTo(2);
        }
    }

    @Test
    void runtimeRoleIsNotSuperuserAndDoesNotBypassRls() throws Exception {
        assertThat(queryBoolean("SELECT rolsuper FROM pg_roles WHERE rolname = 'eam_runtime'")).isFalse();
        assertThat(queryBoolean("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'eam_runtime'")).isFalse();
    }

    @Test
    void rlsIsEnabledOnTenantsAndUsers() throws Exception {
        assertThat(queryBoolean("SELECT relrowsecurity FROM pg_class WHERE oid = 'eam.tenants'::regclass")).isTrue();
        assertThat(queryBoolean("SELECT relrowsecurity FROM pg_class WHERE oid = 'eam.users'::regclass")).isTrue();
    }

    @Test
    void runtimeRoleCannotHardDelete() throws Exception {
        UUID tenantId = UUID.randomUUID();
        seedTenantWithUser(tenantId, "delete-" + tenantId + "@example.com");
        try (Connection runtime = runtimeConnection(tenantId);
             Statement statement = runtime.createStatement()) {
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM eam.users"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }

    @Test
    void loginLookupRoleReadsEmailAcrossTenantsButCannotWrite() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@example.com";
        String emailB = "b-" + tenantB + "@example.com";
        seedTenantWithUser(tenantA, emailA);
        seedTenantWithUser(tenantB, emailB);

        try (Connection login = loginLookupConnection();
             Statement statement = login.createStatement();
             ResultSet rs = statement.executeQuery("SELECT email FROM eam.users")) {
            List<String> emails = new ArrayList<>();
            while (rs.next()) {
                emails.add(rs.getString(1));
            }
            assertThat(emails).contains(emailA, emailB);
        }

        try (Connection login = loginLookupConnection();
             Statement statement = login.createStatement()) {
            assertThatThrownBy(() -> statement.executeUpdate("UPDATE eam.users SET email = 'x'"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }
}
