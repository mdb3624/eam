package com.eam.asset;

import java.util.UUID;

/** Read-only canonical asset row. location is null when never recorded. */
public record Asset(UUID id, String assetCode, String name, AssetType assetType, AssetStatus status,
                    Criticality criticality, GeoPoint location, String manufacturer, String model,
                    String serialNumber) {
}
