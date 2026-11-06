package com.eam.asset;

public class AssetNotFoundException extends RuntimeException {

    public AssetNotFoundException() {
        super("No matching asset.");
    }
}
