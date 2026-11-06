package com.eam.asset;

public class InvalidAssetSearchException extends RuntimeException {

    public InvalidAssetSearchException() {
        super("Enter an Asset ID.");
    }
}
