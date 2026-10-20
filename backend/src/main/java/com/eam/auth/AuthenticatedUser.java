package com.eam.auth;

import java.util.UUID;

/** Identity carried by a verified access token. role is null for a user with no role. */
public record AuthenticatedUser(UUID userId, UUID tenantId, Role role) {
}
