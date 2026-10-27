package com.eam.auth;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserSummary user) {
}
