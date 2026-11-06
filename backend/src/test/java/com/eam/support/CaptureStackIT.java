package com.eam.support;

import com.eam.auth.AuthProperties;
import com.eam.auth.AuthenticatedUser;
import com.eam.auth.JwtService;
import com.eam.auth.Role;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;

/**
 * Not a test: boots the real app on a fixed port with the HFD capture fixtures (docs/design/US-002)
 * so scripts/visual-check/capture.mjs has a real stack to drive. Skipped unless -Deam.capture.stack=true.
 *
 * mvnw verify -Dit.test=CaptureStackIT -Deam.capture.stack=true -Deam.capture.dir=DIR -Djacoco.skip=true
 *
 * Writes DIR/tokens.txt (operator, norole, expired JWTs), then DIR/ready, and serves until DIR/stop exists.
 */
@EnabledIfSystemProperty(named = "eam.capture.stack", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT, properties = "server.port=9192")
class CaptureStackIT extends AbstractPostgresIT {

    private static final Duration MAX_WAIT = Duration.ofMinutes(30);

    @Test
    void serveCaptureFixtures() throws Exception {
        Path dir = Path.of(System.getProperty("eam.capture.dir"));
        Files.createDirectories(dir);

        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        try (var admin = adminConnection(); var statement = admin.createStatement()) {
            statement.executeUpdate("UPDATE eam.tenants SET name = 'Metro Power' WHERE id = '" + tenantId + "'");
        }
        UUID operator = TenantSeed.seedUser(tenantId, "maria@utility.test", null, "OPERATOR", true);
        UUID noRole = TenantSeed.seedUser(tenantId, "norole@utility.test", null, null, true);

        UUID[] chain = AssetSeed.seedChain(tenantId, "");
        AssetSeed.seed(new AssetSeed.Spec(tenantId, "TX-NOLOC", "TRANSFORMER", chain[1]).named("Oak Ave Transformer"));

        String secret = "integration-test-secret-integration-test-secret";
        JwtService live = new JwtService(new AuthProperties(secret, Duration.ofHours(1)));
        JwtService past = new JwtService(new AuthProperties(secret, Duration.ofSeconds(-60)));
        Files.writeString(dir.resolve("tokens.txt"),
                "operator=" + live.issue(new AuthenticatedUser(operator, tenantId, Role.OPERATOR)) + "\n"
                        + "norole=" + live.issue(new AuthenticatedUser(noRole, tenantId, null)) + "\n"
                        + "expired=" + past.issue(new AuthenticatedUser(operator, tenantId, Role.OPERATOR)) + "\n");
        Files.writeString(dir.resolve("ready"), "ok");

        long deadline = System.nanoTime() + MAX_WAIT.toNanos();
        while (!Files.exists(dir.resolve("stop")) && System.nanoTime() < deadline) {
            Thread.sleep(500);
        }
    }
}
