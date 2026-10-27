package com.eam.db;

import com.eam.support.AbstractPostgresIT;
import com.eam.support.TenantSeed;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigrationIT extends AbstractPostgresIT {

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
        TenantSeed.seedTenantWithUser(tenantId, "delete-" + tenantId + "@example.com");
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
        TenantSeed.seedTenantWithUser(tenantA, emailA);
        TenantSeed.seedTenantWithUser(tenantB, emailB);

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

    // Story: US-001. Schema for credentials, role and disabled flag.

    @Test
    void usersHaveCredentialRoleAndEnabledColumnsWithSafeDefaults() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenantWithUser(tenantId, "defaults-" + tenantId + "@example.com");

        try (Connection admin = adminConnection();
             Statement statement = admin.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT password_hash, role, enabled FROM eam.users WHERE tenant_id = '" + tenantId + "'")) {
            rs.next();
            assertThat(rs.getString("password_hash")).isNull();
            assertThat(rs.getString("role")).isNull();
            assertThat(rs.getBoolean("enabled")).isTrue();
        }
    }

    @Test
    void roleColumnRejectsValuesOutsideTheFiveMvpRoles() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);

        assertThatThrownBy(() -> TenantSeed.seedUser(
                tenantId, "badrole-" + tenantId + "@example.com", null, "GOD_MODE", true))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("users_role_check");
        TenantSeed.seedUser(tenantId, "okrole-" + tenantId + "@example.com", null, "DISPATCHER", true);
    }

    @Test
    void activeEmailIsUniqueAcrossTenantsIgnoringCase() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String email = "dup-" + tenantA + "@example.com";
        TenantSeed.seedTenant(tenantA);
        TenantSeed.seedTenant(tenantB);
        TenantSeed.seedUser(tenantA, email, null, null, true);

        assertThatThrownBy(() -> TenantSeed.seedUser(tenantB, email.toUpperCase(), null, null, true))
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("uq_users_email_active");
    }

    @Test
    void emailCanBeReusedAfterSoftDelete() throws Exception {
        UUID tenantId = UUID.randomUUID();
        String email = "reuse-" + tenantId + "@example.com";
        TenantSeed.seedTenant(tenantId);
        UUID first = TenantSeed.seedUser(tenantId, email, null, null, true);
        try (Connection admin = adminConnection(); Statement statement = admin.createStatement()) {
            statement.executeUpdate("UPDATE eam.users SET deleted_at = CURRENT_TIMESTAMP WHERE id = '" + first + "'");
        }

        TenantSeed.seedUser(tenantId, email, null, null, true);
    }

    @Test
    void loginLookupRoleCannotReadPasswordHashOrRole() throws Exception {
        try (Connection login = loginLookupConnection(); Statement statement = login.createStatement()) {
            assertThatThrownBy(() -> statement.executeQuery("SELECT password_hash FROM eam.users"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
        try (Connection login = loginLookupConnection(); Statement statement = login.createStatement()) {
            assertThatThrownBy(() -> statement.executeQuery("SELECT role FROM eam.users"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }
}
