package com.eam.auth;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Pre-auth email lookup, run as the eam_login_lookup role (column-level SELECT on
 * id, tenant_id, email, deleted_at; cross-tenant by design). Returns only enough to bind a tenant.
 */
public class LoginLookupRepository {

    private final JdbcTemplate jdbc;

    public LoginLookupRepository(JdbcTemplate loginLookupJdbc) {
        this.jdbc = loginLookupJdbc;
    }

    /** email must already be trimmed and lowercased. */
    public Optional<LoginIdentity> findActiveByEmail(String email) {
        List<LoginIdentity> rows = jdbc.query(
                "SELECT id, tenant_id FROM eam.users WHERE lower(email) = ? AND deleted_at IS NULL",
                (rs, i) -> new LoginIdentity(rs.getObject("id", UUID.class), rs.getObject("tenant_id", UUID.class)),
                email);
        return rows.stream().findFirst();
    }
}
