package com.eam.auth;

// Story: US-001. AC 1 (login by role), AC 2 (invalid credentials, no session), AC 3 (no role cannot
// reach role-gated screens), edge cases (disabled account, expiry), plus tenant isolation through RLS.

import com.eam.support.AbstractPostgresIT;
import com.eam.support.TenantSeed;
import com.eam.tenant.TenantContextHolder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthIT extends AbstractPostgresIT {

    private static final String PASSWORD = "Correct-Horse-9";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PasswordEncoder encoder;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AuthProperties properties;

    private String email(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@utility.test";
    }

    private UUID seedUser(UUID tenantId, String email, String role, boolean enabled) throws Exception {
        return TenantSeed.seedUser(tenantId, email, encoder.encode(PASSWORD), role, enabled);
    }

    private UUID newTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantSeed.seedTenant(tenantId);
        return tenantId;
    }

    private MvcResult login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, password)))).andReturn();
    }

    private String tokenFor(String email) throws Exception {
        MvcResult result = login(email, PASSWORD);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void dispatcherLogsInAndTokenCarriesTheirRole() throws Exception {
        String email = email("dwayne");
        seedUser(newTenant(), email, "DISPATCHER", true);

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("DISPATCHER"))
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.expiresIn").value(properties.tokenTtl().toSeconds()));
    }

    @Test
    void loginIsCaseInsensitiveOnEmail() throws Exception {
        String email = email("case");
        seedUser(newTenant(), email, "OPERATOR", true);

        assertThat(login(email.toUpperCase(), PASSWORD).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSame401AndNoToken() throws Exception {
        String email = email("maria");
        seedUser(newTenant(), email, "OPERATOR", true);

        MvcResult wrong = login(email, "nope");
        MvcResult unknown = login(email("ghost"), "nope");

        assertThat(wrong.getResponse().getStatus()).isEqualTo(401);
        assertThat(unknown.getResponse().getStatus()).isEqualTo(401);
        assertThat(wrong.getResponse().getContentAsString()).isEqualTo(unknown.getResponse().getContentAsString());
        assertThat(wrong.getResponse().getContentAsString()).doesNotContain("accessToken");
    }

    @Test
    void disabledAccountGetsDistinctMessageOnlyWithCorrectPassword() throws Exception {
        String email = email("sam");
        seedUser(newTenant(), email, "SYSTEM_ADMIN", false);

        MvcResult withPassword = login(email, PASSWORD);
        MvcResult wrongPassword = login(email, "nope");

        assertThat(withPassword.getResponse().getStatus()).isEqualTo(403);
        assertThat(withPassword.getResponse().getContentAsString()).contains("ACCOUNT_DISABLED");
        assertThat(wrongPassword.getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void softDeletedUserCannotLogIn() throws Exception {
        String email = email("gone");
        UUID id = seedUser(newTenant(), email, "OPERATOR", true);
        try (var admin = adminConnection(); var statement = admin.createStatement()) {
            statement.executeUpdate("UPDATE eam.users SET deleted_at = CURRENT_TIMESTAMP WHERE id = '" + id + "'");
        }

        assertThat(login(email, PASSWORD).getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void validTokenOpensMeAndMissingOrBadTokensAre401() throws Exception {
        String email = email("jess");
        seedUser(newTenant(), email, "FIELD_TECHNICIAN", true);
        String token = tokenFor(email);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("FIELD_TECHNICIAN"));
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer garbage"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Basic abc"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        UUID tenantId = newTenant();
        String email = email("late");
        UUID id = seedUser(tenantId, email, "OPERATOR", true);
        String expired = new JwtService(new AuthProperties(
                "x".repeat(40), Duration.ofSeconds(-10)))
                .issue(new AuthenticatedUser(id, tenantId, Role.OPERATOR));

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void dispatcherReachesRoleGatedEndpointAndOtherRolesAndNoRoleAreDenied() throws Exception {
        UUID tenantId = newTenant();
        String dispatcher = email("d");
        String operator = email("o");
        String noRole = email("n");
        seedUser(tenantId, dispatcher, "DISPATCHER", true);
        seedUser(tenantId, operator, "OPERATOR", true);
        seedUser(tenantId, noRole, null, true);

        mockMvc.perform(get("/api/v1/test/dispatch-probe").header("Authorization", "Bearer " + tokenFor(dispatcher)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/test/dispatch-probe").header("Authorization", "Bearer " + tokenFor(operator)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("You do not have access to this screen."));
        mockMvc.perform(get("/api/v1/test/dispatch-probe").header("Authorization", "Bearer " + tokenFor(noRole)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }

    @Test
    void userWithNoRoleIsAuthenticatedAndSeesTheirOwnProfile() throws Exception {
        String email = email("norole");
        seedUser(newTenant(), email, null, true);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + tokenFor(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").doesNotExist());
    }

    @Test
    void tokenCannotBeUsedToReachAUserInAnotherTenant() throws Exception {
        UUID tenantA = newTenant();
        UUID tenantB = newTenant();
        UUID userInA = seedUser(tenantA, email("a"), "OPERATOR", true);
        // Properly signed token that claims user A belongs to tenant B.
        String forged = new JwtService(properties)
                .issue(new AuthenticatedUser(userInA, tenantB, Role.SYSTEM_ADMIN));

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginRequestIsValidatedAtTheBoundary() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void tenantContextDoesNotLeakBetweenRequests() throws Exception {
        UUID tenantId = newTenant();
        String email = email("leak");
        seedUser(tenantId, email, "OPERATOR", true);
        String token = tokenFor(email);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        assertThatThrownBy(TenantContextHolder::getTenantId).isInstanceOf(IllegalStateException.class);
    }
}
