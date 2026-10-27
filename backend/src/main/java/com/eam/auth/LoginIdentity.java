package com.eam.auth;

import java.util.UUID;

/** Result of the pre-auth lookup: just enough to bind a tenant and load the user under RLS. */
public record LoginIdentity(UUID userId, UUID tenantId) {
}
