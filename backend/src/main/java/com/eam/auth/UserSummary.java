package com.eam.auth;

import java.util.UUID;

public record UserSummary(UUID id, String email, Role role) {
}
