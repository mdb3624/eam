package com.eam.support;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Inserts assets as the bootstrap admin (bypasses RLS) so tests control exactly what exists.
 * Latitude and longitude are WGS84; pass null for both to leave the location never recorded.
 */
public final class AssetSeed {

    private AssetSeed() {
    }

    /** Everything optional about an asset; use the withX methods and then seed(). */
    public record Spec(UUID tenantId, String code, String type, UUID parentId, String name, String status,
                       String criticality, Double latitude, Double longitude, String manufacturer,
                       String model, String serialNumber) {

        public Spec(UUID tenantId, String code, String type, UUID parentId) {
            this(tenantId, code, type, parentId, "Name " + code, "IN_SERVICE", "MEDIUM", null, null,
                    null, null, null);
        }

        public Spec at(double lat, double lon) {
            return new Spec(tenantId, code, type, parentId, name, status, criticality, lat, lon,
                    manufacturer, model, serialNumber);
        }

        public Spec named(String newName) {
            return new Spec(tenantId, code, type, parentId, newName, status, criticality, latitude,
                    longitude, manufacturer, model, serialNumber);
        }

        public Spec state(String newStatus, String newCriticality) {
            return new Spec(tenantId, code, type, parentId, name, newStatus, newCriticality, latitude,
                    longitude, manufacturer, model, serialNumber);
        }

        public Spec made(String newManufacturer, String newModel, String newSerial) {
            return new Spec(tenantId, code, type, parentId, name, status, criticality, latitude, longitude,
                    newManufacturer, newModel, newSerial);
        }
    }

    public static UUID seed(Spec spec) throws SQLException {
        UUID id = UUID.randomUUID();
        try (Connection admin = AbstractPostgresIT.adminConnection();
             PreparedStatement insert = admin.prepareStatement(
                     "INSERT INTO eam.assets (id, tenant_id, asset_code, name, asset_type, parent_id, status,"
                             + " criticality, location, manufacturer, model, serial_number)"
                             + " VALUES (?, ?, ?, ?, ?, ?, ?, ?,"
                             + " CASE WHEN ?::float8 IS NULL THEN NULL"
                             + " ELSE public.ST_SetSRID(public.ST_MakePoint(?::float8, ?::float8), 4326)::public.geography END,"
                             + " ?, ?, ?)")) {
            insert.setObject(1, id);
            insert.setObject(2, spec.tenantId());
            insert.setString(3, spec.code());
            insert.setString(4, spec.name());
            insert.setString(5, spec.type());
            insert.setObject(6, spec.parentId());
            insert.setString(7, spec.status());
            insert.setString(8, spec.criticality());
            insert.setObject(9, spec.latitude());
            insert.setObject(10, spec.longitude());
            insert.setObject(11, spec.latitude());
            insert.setString(12, spec.manufacturer());
            insert.setString(13, spec.model());
            insert.setString(14, spec.serialNumber());
            insert.executeUpdate();
        }
        return id;
    }

    public static UUID seed(UUID tenantId, String code, String type, UUID parentId) throws SQLException {
        return seed(new Spec(tenantId, code, type, parentId));
    }

    public static void softDelete(UUID assetId) throws SQLException {
        try (Connection admin = AbstractPostgresIT.adminConnection(); Statement statement = admin.createStatement()) {
            statement.executeUpdate("UPDATE eam.assets SET deleted_at = CURRENT_TIMESTAMP WHERE id = '" + assetId + "'");
        }
    }

    /** One substation SUB-3, feeder F-12 and transformer TX-4587 in the tenant; ids returned root first. */
    public static UUID[] seedChain(UUID tenantId, String suffix) throws SQLException {
        UUID substation = seed(tenantId, "SUB-3" + suffix, "SUBSTATION", null);
        UUID feeder = seed(tenantId, "F-12" + suffix, "FEEDER", substation);
        UUID transformer = seed(new Spec(tenantId, "TX-4587" + suffix, "TRANSFORMER", feeder)
                .named("Main St Transformer").state("IN_SERVICE", "HIGH").at(40.7128, -74.0060)
                .made("ABB", "TX-200", "SN-99812"));
        return new UUID[] {substation, feeder, transformer};
    }
}
