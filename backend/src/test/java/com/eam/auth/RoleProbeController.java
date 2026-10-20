package com.eam.auth;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only stand-in for a role-gated screen API (the real Dispatch board API arrives with US-014).
 * Proves the role gating mechanism for US-001 AC 3 without building speculative production endpoints.
 */
@RestController
class RoleProbeController {

    @GetMapping("/api/v1/test/dispatch-probe")
    @PreAuthorize("hasRole('DISPATCHER')")
    String dispatchOnly() {
        return "dispatch";
    }
}
