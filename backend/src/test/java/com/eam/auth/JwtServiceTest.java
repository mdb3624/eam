package com.eam.auth;

// Story: US-001 (User Login and Role-Based Access). Supports AC 1 (login issues role-bearing token),
// AC 2 (no valid token without valid credentials) and AC 3 (token without role).

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-0123456789";
    private static final String OTHER_SECRET = "another-secret-another-secret-9876543210!!";

    private final UUID userId = UUID.randomUUID();
    private final UUID tenantId = UUID.randomUUID();

    private JwtService service(String secret, Duration ttl) {
        return new JwtService(new AuthProperties(secret, ttl));
    }

    @Test
    void issuedTokenParsesBackToTheSameUser() {
        JwtService jwt = service(SECRET, Duration.ofMinutes(5));

        String token = jwt.issue(new AuthenticatedUser(userId, tenantId, Role.DISPATCHER));

        assertThat(jwt.parse(token)).contains(new AuthenticatedUser(userId, tenantId, Role.DISPATCHER));
    }

    @Test
    void tokenForUserWithoutRoleCarriesNoRoleClaim() {
        JwtService jwt = service(SECRET, Duration.ofMinutes(5));

        String token = jwt.issue(new AuthenticatedUser(userId, tenantId, null));

        String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
        assertThat(payload).doesNotContain("\"role\"");
        assertThat(jwt.parse(token)).contains(new AuthenticatedUser(userId, tenantId, null));
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = service(SECRET, Duration.ofSeconds(-5));

        String token = jwt.issue(new AuthenticatedUser(userId, tenantId, Role.OPERATOR));

        assertThat(jwt.parse(token)).isEmpty();
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String foreign = service(OTHER_SECRET, Duration.ofMinutes(5))
                .issue(new AuthenticatedUser(userId, tenantId, Role.OPERATOR));

        assertThat(service(SECRET, Duration.ofMinutes(5)).parse(foreign)).isEmpty();
    }

    @Test
    void tamperedPayloadIsRejected() {
        JwtService jwt = service(SECRET, Duration.ofMinutes(5));
        String[] parts = jwt.issue(new AuthenticatedUser(userId, tenantId, Role.OPERATOR)).split("\\.");
        String forgedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"sub\":\"" + userId + "\",\"tid\":\"" + tenantId + "\",\"role\":\"SYSTEM_ADMIN\"}")
                        .getBytes(StandardCharsets.UTF_8));

        assertThat(jwt.parse(parts[0] + "." + forgedPayload + "." + parts[2])).isEmpty();
    }

    @Test
    void garbageAndBlankTokensAreRejected() {
        JwtService jwt = service(SECRET, Duration.ofMinutes(5));

        assertThat(jwt.parse("not-a-jwt")).isEmpty();
        assertThat(jwt.parse("")).isEmpty();
        assertThat(jwt.parse(null)).isEmpty();
    }

    @Test
    void tokenWithUnknownRoleValueIsRejected() {
        String token = Jwts.builder()
                .subject(userId.toString())
                .claim("tid", tenantId.toString())
                .claim("role", "GOD_MODE")
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThat(service(SECRET, Duration.ofMinutes(5)).parse(token)).isEmpty();
    }

    @Test
    void tokenMissingTenantClaimIsRejected() {
        String token = Jwts.builder()
                .subject(userId.toString())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThat(service(SECRET, Duration.ofMinutes(5)).parse(token)).isEmpty();
    }

    @Test
    void secretShorterThan32BytesFailsFast() {
        assertThatThrownBy(() -> service("too-short", Duration.ofMinutes(5)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("32");
    }

    @Test
    void missingSecretFailsFast() {
        assertThatThrownBy(() -> service(null, Duration.ofMinutes(5)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
