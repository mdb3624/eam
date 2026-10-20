package com.eam.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/** Issues and verifies HS256 access tokens. Claims: sub (user id), tid (tenant id), role (omitted if none). */
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String TENANT_CLAIM = "tid";
    private static final String ROLE_CLAIM = "role";

    private final SecretKey key;
    private final AuthProperties properties;

    public JwtService(AuthProperties properties) {
        byte[] secret = properties.jwtSecret() == null ? new byte[0]
                : properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalArgumentException(
                    "eam.auth.jwt-secret must be at least " + MIN_SECRET_BYTES + " bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.properties = properties;
    }

    public String issue(AuthenticatedUser user) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(user.userId().toString())
                .claim(TENANT_CLAIM, user.tenantId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.tokenTtl())));
        if (user.role() != null) {
            builder.claim(ROLE_CLAIM, user.role().name());
        }
        return builder.signWith(key, Jwts.SIG.HS256).compact();
    }

    /** Empty for anything that is not a currently valid token issued with our secret. */
    public Optional<AuthenticatedUser> parse(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            String role = claims.get(ROLE_CLAIM, String.class);
            return Optional.of(new AuthenticatedUser(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(claims.get(TENANT_CLAIM, String.class)),
                    role == null ? null : Role.valueOf(role)));
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            return Optional.empty();
        }
    }
}
