package com.eam.asset;

import java.util.UUID;

public record AssetSummary(UUID id, String assetCode, String name, AssetType assetType, AssetStatus status,
                           Criticality criticality) {

    static AssetSummary of(Asset asset) {
        return new AssetSummary(asset.id(), asset.assetCode(), asset.name(), asset.assetType(), asset.status(),
                asset.criticality());
    }
}
