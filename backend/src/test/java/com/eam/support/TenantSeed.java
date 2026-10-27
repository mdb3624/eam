package com.eam.support;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/** Inserts rows as the bootstrap admin (bypasses RLS) so tests control exactly what exists. */
public final class TenantSeed {

    private TenantSeed() {
    }

    public static void seedTenant(UUID tenantId) throws SQLException {
        try (Connection admin = AbstractPostgresIT.adminConnection();
             PreparedStatement tenant = admin.prepareStatement(
                     "INSERT INTO eam.tenants (id, name) VALUES (?, ?)")) {
            tenant.setObject(1, tenantId);
            tenant.setString(2, "Tenant " + tenantId);
            tenant.executeUpdate();
        }
    }

    /** Seeds a user with credentials in an existing tenant. role and passwordHash may be null. */
    public static UUID seedUser(UUID tenantId, String email, String passwordHash, String role, boolean enabled)
            throws SQLException {
        UUID userId = UUID.randomUUID();
        try (Connection admin = AbstractPostgresIT.adminConnection();
             PreparedStatement user = admin.prepareStatement(
                     "INSERT INTO eam.users (id, tenant_id, email, password_hash, role, enabled)"
                             + " VALUES (?, ?, ?, ?, ?, ?)")) {
            user.setObject(1, userId);
            user.setObject(2, tenantId);
            user.setString(3, email);
            user.setString(4, passwordHash);
            user.setString(5, role);
            user.setBoolean(6, enabled);
            user.executeUpdate();
        }
        return userId;
    }

    public static void seedTenantWithUser(UUID tenantId, String email) throws SQLException {
        try (Connection admin = AbstractPostgresIT.adminConnection()) {
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
}
