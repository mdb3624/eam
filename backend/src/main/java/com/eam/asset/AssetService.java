package com.eam.asset;

import com.eam.tenant.TenantContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The single asset lookup. Later stories (alarms, incidents, work orders) reuse get(); do not add a
 * second one. Read-only transaction so SET LOCAL app.current_tenant applies.
 */
@Service
@Transactional(readOnly = true)
public class AssetService {

    private static final String UTILITY = "UTILITY";

    private final AssetRepository assets;

    public AssetService(AssetRepository assets) {
        this.assets = assets;
    }

    /** Exact, case-insensitive match on the Asset ID. At most one row today, an array for later multi-field search. */
    public List<AssetSummary> search(String assetCode) {
        return assets.findByCodeIgnoreCase(tenantId(), assetCode).map(AssetSummary::of).stream().toList();
    }

    public AssetDetail get(UUID id) {
        UUID tenantId = tenantId();
        Asset asset = assets.findById(tenantId, id).orElseThrow(AssetNotFoundException::new);
        List<HierarchyEntry> hierarchy = new ArrayList<>();
        hierarchy.add(new HierarchyEntry(tenantId, null, assets.findTenantName(tenantId), UTILITY));
        hierarchy.addAll(assets.findAncestors(tenantId, id));
        return AssetDetail.of(asset, hierarchy);
    }

    private static UUID tenantId() {
        return UUID.fromString(TenantContextHolder.getTenantId());
    }
}
