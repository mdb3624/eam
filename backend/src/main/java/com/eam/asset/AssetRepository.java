package com.eam.asset;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Plain SQL on the runtime JdbcTemplate (RLS applies). Every query also carries the tenant filter and
 * deleted_at IS NULL as defense in depth. PostGIS names are schema-qualified because the connection
 * search_path is eam only.
 */
@Repository
public class AssetRepository {

    /** Cycle guard for the recursive hierarchy walk. */
    private static final int MAX_DEPTH = 10;

    private static final String COLUMNS = "id, asset_code, name, asset_type, status, criticality,"
            + " public.ST_Y(location::public.geometry) AS latitude,"
            + " public.ST_X(location::public.geometry) AS longitude,"
            + " manufacturer, model, serial_number";

    private static final RowMapper<Asset> ASSET_MAPPER = (rs, i) -> {
        Double latitude = rs.getObject("latitude", Double.class);
        Double longitude = rs.getObject("longitude", Double.class);
        return new Asset(
                rs.getObject("id", UUID.class),
                rs.getString("asset_code"),
                rs.getString("name"),
                AssetType.valueOf(rs.getString("asset_type")),
                AssetStatus.valueOf(rs.getString("status")),
                Criticality.valueOf(rs.getString("criticality")),
                latitude == null ? null : new GeoPoint(latitude, longitude),
                rs.getString("manufacturer"),
                rs.getString("model"),
                rs.getString("serial_number"));
    };

    private final JdbcTemplate jdbc;

    public AssetRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** code must already be trimmed. */
    public Optional<Asset> findByCodeIgnoreCase(UUID tenantId, String code) {
        return jdbc.query("SELECT " + COLUMNS + " FROM eam.assets"
                        + " WHERE tenant_id = ? AND lower(asset_code) = lower(?) AND deleted_at IS NULL",
                ASSET_MAPPER, tenantId, code).stream().findFirst();
    }

    public Optional<Asset> findById(UUID tenantId, UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM eam.assets"
                        + " WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL",
                ASSET_MAPPER, tenantId, id).stream().findFirst();
    }

    /** The asset and its active ancestors, root first. Stops at a soft-deleted ancestor. */
    public List<HierarchyEntry> findAncestors(UUID tenantId, UUID id) {
        return jdbc.query("WITH RECURSIVE chain AS ("
                        + " SELECT id, parent_id, asset_code, name, asset_type, 1 AS depth FROM eam.assets"
                        + "  WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL"
                        + " UNION ALL"
                        + " SELECT a.id, a.parent_id, a.asset_code, a.name, a.asset_type, c.depth + 1"
                        + "  FROM eam.assets a JOIN chain c ON a.id = c.parent_id"
                        + "  WHERE a.tenant_id = ? AND a.deleted_at IS NULL AND c.depth < " + MAX_DEPTH + ")"
                        + " SELECT id, asset_code, name, asset_type FROM chain ORDER BY depth DESC",
                (rs, i) -> new HierarchyEntry(rs.getObject("id", UUID.class), rs.getString("asset_code"),
                        rs.getString("name"), rs.getString("asset_type")),
                tenantId, id, tenantId);
    }

    public String findTenantName(UUID tenantId) {
        return jdbc.queryForObject("SELECT name FROM eam.tenants WHERE id = ? AND deleted_at IS NULL",
                String.class, tenantId);
    }
}
