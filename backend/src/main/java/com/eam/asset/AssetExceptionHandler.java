package com.eam.asset;

import com.eam.auth.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(assignableTypes = AssetController.class)
public class AssetExceptionHandler {

    @ExceptionHandler(AssetNotFoundException.class)
    public ResponseEntity<ApiError> notFound(AssetNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("ASSET_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(InvalidAssetSearchException.class)
    public ResponseEntity<ApiError> invalidSearch(InvalidAssetSearchException e) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", e.getMessage()));
    }

    /** A path id that is not a UUID can never match an asset. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> malformedId(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", "Enter a valid Asset ID."));
    }
}
