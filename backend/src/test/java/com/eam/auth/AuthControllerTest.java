package com.eam.auth;

// Story: US-001. AC 1 (login response shape), AC 2 (401, no token), edge case (403 disabled),
// request validation at the trust boundary.

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuthExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    private static String body(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void successfulLoginReturnsTokenAndUser() throws Exception {
        UUID id = UUID.randomUUID();
        when(authService.login("maria@utility.com", "pw"))
                .thenReturn(new LoginResponse("tok", "Bearer", 3600,
                        new UserSummary(id, "maria@utility.com", Role.DISPATCHER)));

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("maria@utility.com", "pw")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("tok"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.id").value(id.toString()))
                .andExpect(jsonPath("$.user.role").value("DISPATCHER"));
    }

    @Test
    void invalidCredentialsReturn401WithCodeAndNoToken() throws Exception {
        when(authService.login(any(), any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("maria@utility.com", "bad")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."))
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    void disabledAccountReturns403WithDistinctCode() throws Exception {
        when(authService.login(any(), any())).thenThrow(new AccountDisabledException());

        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("maria@utility.com", "pw")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"))
                .andExpect(jsonPath("$.message").value("This account is disabled. Contact your administrator."));
    }

    @Test
    void blankEmailOrPasswordIsRejectedBeforeReachingTheService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("", "pw")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("maria@utility.com", "")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(authService);
    }

    @Test
    void malformedEmailAndMissingBodyAreRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(body("not-an-email", "pw")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void meReturnsTheCurrentUserSummary() throws Exception {
        UUID id = UUID.randomUUID();
        UUID tenant = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(id, tenant, Role.OPERATOR);
        when(authService.currentUser(principal))
                .thenReturn(new UserSummary(id, "maria@utility.com", Role.OPERATOR));

        mockMvc.perform(get("/api/v1/auth/me")
                        .principal(new UsernamePasswordAuthenticationToken(principal, null, List.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("maria@utility.com"))
                .andExpect(jsonPath("$.role").value("OPERATOR"));
    }
}
