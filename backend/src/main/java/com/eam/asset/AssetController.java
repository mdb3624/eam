package com.eam.asset;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
@PreAuthorize("hasAnyRole('OPERATOR','DISPATCHER','FIELD_TECHNICIAN','MAINTENANCE_SUPERVISOR','SYSTEM_ADMIN')")
public class AssetController {

    private static final int MAX_CODE_LENGTH = 50;

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    public List<AssetSummary> search(@RequestParam(required = false) String assetId) {
        String code = assetId == null ? "" : assetId.trim();
        if (code.isEmpty() || code.length() > MAX_CODE_LENGTH) {
            throw new InvalidAssetSearchException();
        }
        return assetService.search(code);
    }

    @GetMapping("/{id}")
    public AssetDetail get(@PathVariable UUID id) {
        return assetService.get(id);
    }
}
