package com.eam.db;

import com.eam.support.AbstractPostgresIT;
import com.eam.support.AssetSeed;
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

    // Story: US-002. Assets: PostGIS, self-referencing hierarchy, DB-enforced rules, RLS.

    private static void assertRejected(String constraint, java.util.concurrent.Callable<?> insert) {
        assertThatThrownBy(insert::call).isInstanceOf(SQLException.class).hasMessageContaining(constraint);
    }

    @Test
    void postgisIsEnabledAndRuntimeCanResolveGeographyFunctions() throws Exception {
        assertThat(queryBoolean("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")).isTrue();
        try (Connection runtime = runtimeConnection(null); Statement statement = runtime.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT public.ST_X(public.ST_SetSRID(public.ST_MakePoint(1, 2), 4326)::public.geography::public.geometry)")) {
            rs.next();
            assertThat(rs.getDouble(1)).isEqualTo(1.0);
        }
    }

    @Test
    void assetsHaveRlsGistIndexPartialUniqueCodeAndNoRuntimeDelete() throws Exception {
        assertThat(queryBoolean("SELECT relrowsecurity FROM pg_class WHERE oid = 'eam.assets'::regclass")).isTrue();
        assertThat(queryBoolean("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'eam'"
                + " AND indexname = 'idx_assets_location' AND indexdef LIKE '%USING gist%')")).isTrue();
        assertThat(queryBoolean("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'eam'"
                + " AND indexname = 'uq_assets_code_active' AND indexdef LIKE '%lower%'"
                + " AND indexdef LIKE '%deleted_at IS NULL%')")).isTrue();
        assertThat(queryBoolean("SELECT has_table_privilege('eam_runtime', 'eam.assets', 'DELETE')")).isFalse();
        assertThat(queryBoolean("SELECT has_table_privilege('eam_runtime', 'eam.assets', 'SELECT')")).isTrue();
        assertThat(queryBoolean("SELECT has_table_privilege('eam_login_lookup', 'eam.assets', 'SELECT')")).isFalse();
    }

    @Test
    void assetTypeStatusAndCriticalityRejectValuesOutsideTheirSets() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        UUID substation = AssetSeed.seed(tenantId, "SUB-CHK", "SUBSTATION", null);

        assertRejected("assets_asset_type_check", () -> AssetSeed.seed(tenantId, "BAD-T", "WIDGET", null));
        assertRejected("assets_status_check", () -> AssetSeed.seed(
                new AssetSeed.Spec(tenantId, "BAD-S", "SUBSTATION", null).state("BROKEN", "LOW")));
        assertRejected("assets_criticality_check", () -> AssetSeed.seed(
                new AssetSeed.Spec(tenantId, "BAD-C", "SUBSTATION", null).state("IN_SERVICE", "EXTREME")));
        assertThat(substation).isNotNull();
    }

    @Test
    void substationsAreRootsAndOtherTypesNeedAParent() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        UUID substation = AssetSeed.seed(tenantId, "SUB-ROOT", "SUBSTATION", null);

        assertRejected("assets_root_is_substation", () -> AssetSeed.seed(tenantId, "SUB-KID", "SUBSTATION", substation));
        assertRejected("assets_root_is_substation", () -> AssetSeed.seed(tenantId, "F-ORPHAN", "FEEDER", null));
    }

    @Test
    void parentTypeIsEnforcedByTheDatabase() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        UUID[] chain = AssetSeed.seedChain(tenantId, "-PT");

        assertRejected("must be a SUBSTATION", () -> AssetSeed.seed(tenantId, "F-UNDER-TX", "FEEDER", chain[2]));
        assertRejected("must be a FEEDER", () -> AssetSeed.seed(tenantId, "TX-UNDER-SUB", "TRANSFORMER", chain[0]));
        AssetSeed.seed(tenantId, "TX-OK", "TRANSFORMER", chain[1]);
    }

    @Test
    void parentMustBelongToTheSameTenant() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        TenantSeed.seedTenant(tenantA);
        TenantSeed.seedTenant(tenantB);
        UUID substationInA = AssetSeed.seed(tenantA, "SUB-A", "SUBSTATION", null);

        assertThatThrownBy(() -> AssetSeed.seed(tenantB, "F-CROSS", "FEEDER", substationInA))
                .isInstanceOf(SQLException.class);
    }

    @Test
    void activeAssetCodeIsUniquePerTenantIgnoringCaseAndReusableAfterSoftDelete() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        TenantSeed.seedTenant(tenantA);
        TenantSeed.seedTenant(tenantB);
        UUID first = AssetSeed.seed(tenantA, "DUP-1", "SUBSTATION", null);

        assertRejected("uq_assets_code_active", () -> AssetSeed.seed(tenantA, "dup-1", "SUBSTATION", null));
        AssetSeed.seed(tenantB, "DUP-1", "SUBSTATION", null);
        AssetSeed.softDelete(first);
        AssetSeed.seed(tenantA, "DUP-1", "SUBSTATION", null);
    }

    @Test
    void runtimeRoleCannotHardDeleteAssetsAndSeesOnlyItsTenant() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        TenantSeed.seedTenant(tenantA);
        TenantSeed.seedTenant(tenantB);
        AssetSeed.seed(tenantA, "RLS-A", "SUBSTATION", null);
        AssetSeed.seed(tenantB, "RLS-B", "SUBSTATION", null);

        try (Connection runtime = runtimeConnection(tenantA); Statement statement = runtime.createStatement()) {
            try (ResultSet rs = statement.executeQuery("SELECT asset_code FROM eam.assets")) {
                List<String> codes = new ArrayList<>();
                while (rs.next()) {
                    codes.add(rs.getString(1));
                }
                assertThat(codes).contains("RLS-A").doesNotContain("RLS-B");
            }
            assertThatThrownBy(() -> statement.executeUpdate("DELETE FROM eam.assets"))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("permission denied");
        }
    }
}
