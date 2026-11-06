package com.eam.asset;

import java.util.UUID;

/** One step of the utility to asset path. The utility entry has the tenant id, no assetCode and type UTILITY. */
public record HierarchyEntry(UUID id, String assetCode, String name, String assetType) {
}
