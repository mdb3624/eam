package com.eam.asset;

import java.util.List;
import java.util.UUID;

public record AssetDetail(UUID id, String assetCode, String name, AssetType assetType, AssetStatus status,
                          Criticality criticality, GeoPoint location, String manufacturer, String model,
                          String serialNumber, List<HierarchyEntry> hierarchy) {

    static AssetDetail of(Asset asset, List<HierarchyEntry> hierarchy) {
        return new AssetDetail(asset.id(), asset.assetCode(), asset.name(), asset.assetType(), asset.status(),
                asset.criticality(), asset.location(), asset.manufacturer(), asset.model(),
                asset.serialNumber(), hierarchy);
    }
}
