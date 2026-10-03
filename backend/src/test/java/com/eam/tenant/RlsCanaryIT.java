package com.eam.tenant;

import com.eam.support.AbstractPostgresIT;
import com.eam.support.TenantSeed;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RlsCanaryIT extends AbstractPostgresIT {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @AfterEach
    void cleanUp() {
        TenantContextHolder.clear();
    }

    private List<String> emailsVisible() {
        return jdbcTemplate.queryForList(
                "SELECT email FROM eam.users WHERE email LIKE '%@canary.test'", String.class);
    }

    private List<String> emailsVisibleInTransaction() {
        List<String> emails = transactionTemplate.execute(status -> emailsVisible());
        return emails;
    }

    @Test
    void appConnectionIsNotSuperuser() throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)")) {
            rs.next();
            assertThat(rs.getString(1)).isEqualTo(RUNTIME_USER);
            assertThat(rs.getBoolean(2)).isFalse();
        }
    }

    @Test
    void rlsIsolatesTenants() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@canary.test";
        String emailB = "b-" + tenantB + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, emailA);
        TenantSeed.seedTenantWithUser(tenantB, emailB);

        TenantContextHolder.setTenantId(tenantA.toString());
        assertThat(emailsVisibleInTransaction()).containsExactly(emailA);

        TenantContextHolder.setTenantId(tenantB.toString());
        assertThat(emailsVisibleInTransaction()).containsExactly(emailB);
    }

    @Test
    void failsClosedWhenNoTenantBound() throws Exception {
        TenantSeed.seedTenantWithUser(UUID.randomUUID(), "unbound-" + UUID.randomUUID() + "@canary.test");

        TenantContextHolder.clear();
        assertThat(emailsVisibleInTransaction()).isEmpty();
    }

    @Test
    void settingTenantInsideAnOpenTransactionTakesEffect() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailB = "b-" + tenantB + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, "a-" + tenantA + "@canary.test");
        TenantSeed.seedTenantWithUser(tenantB, emailB);

        List<String> seen = transactionTemplate.execute(status -> {
            assertThat(emailsVisible()).isEmpty();
            TenantContextHolder.setTenantId(tenantB.toString());
            return emailsVisible();
        });
        assertThat(seen).containsExactly(emailB);
    }

    @Test
    void tenantContextSurvivesCommitOnSameConnection() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        String emailA = "a-" + tenantA + "@canary.test";
        TenantSeed.seedTenantWithUser(tenantA, emailA);
        TenantSeed.seedTenantWithUser(tenantB, "b-" + tenantB + "@canary.test");

        TenantContextHolder.setTenantId(tenantA.toString());
        try (Connection connection = dataSource.getConnection()) {
            assertThat(visibleOn(connection)).containsExactly(emailA);
            connection.commit();
            assertThat(visibleOn(connection)).containsExactly(emailA);
            connection.rollback();
            assertThat(visibleOn(connection)).containsExactly(emailA);
        }
    }

    private static List<String> visibleOn(Connection connection) throws Exception {
        List<String> emails = new ArrayList<>();
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(
                     "SELECT email FROM eam.users WHERE email LIKE '%@canary.test'")) {
            while (rs.next()) {
                emails.add(rs.getString(1));
            }
        }
        return emails;
    }
}
