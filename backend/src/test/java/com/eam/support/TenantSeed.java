package com.eam.support;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/** Inserts rows as the bootstrap admin (bypasses RLS) so tests control exactly what exists. */
public final class TenantSeed {

    private TenantSeed() {
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
