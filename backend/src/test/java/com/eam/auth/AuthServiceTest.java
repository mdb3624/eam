package com.eam.auth;

// Story: US-001. AC 1 (successful login), AC 2 (invalid credentials rejected, no token),
// edge case: a disabled account gets a distinct outcome from a wrong password.

import com.eam.tenant.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-0123456789";

    @Mock
    private LoginLookupRepository lookup;
    @Mock
    private UserRepository users;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final AuthProperties properties = new AuthProperties(SECRET, Duration.ofMinutes(30));
    private final JwtService jwt = new JwtService(properties);
    private AuthService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID tenantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new AuthService(lookup, users, jwt, encoder, properties);
    }

    @AfterEach
    void clearTenant() {
        TenantContextHolder.clear();
    }

    private User user(String password, Role role, boolean enabled) {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "tenantId", tenantId);
        ReflectionTestUtils.setField(user, "email", "maria@utility.com");
        ReflectionTestUtils.setField(user, "passwordHash", password == null ? null : encoder.encode(password));
        ReflectionTestUtils.setField(user, "role", role);
        ReflectionTestUtils.setField(user, "enabled", enabled);
        return user;
    }

    private void found(User user) {
        when(lookup.findActiveByEmail("maria@utility.com")).thenReturn(Optional.of(new LoginIdentity(userId, tenantId)));
        when(users.findByIdAndTenantIdAndDeletedAtIsNull(userId, tenantId)).thenReturn(Optional.ofNullable(user));
    }

    @Test
    void successfulLoginReturnsTokenWithRoleAndExpiry() {
        found(user("s3cret!", Role.DISPATCHER, true));

        LoginResponse response = service.login("maria@utility.com", "s3cret!");

        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(1800);
        assertThat(response.user()).isEqualTo(new UserSummary(userId, "maria@utility.com", Role.DISPATCHER));
        assertThat(jwt.parse(response.accessToken()))
                .contains(new AuthenticatedUser(userId, tenantId, Role.DISPATCHER));
    }

    @Test
    void emailIsTrimmedAndLowercasedBeforeLookup() {
        found(user("s3cret!", Role.OPERATOR, true));

        assertThat(service.login("  Maria@Utility.COM ", "s3cret!").user().role()).isEqualTo(Role.OPERATOR);
    }

    @Test
    void userWithNoRoleStillLogsInWithNullRole() {
        found(user("s3cret!", null, true));

        LoginResponse response = service.login("maria@utility.com", "s3cret!");

        assertThat(response.user().role()).isNull();
        assertThat(jwt.parse(response.accessToken())).contains(new AuthenticatedUser(userId, tenantId, null));
    }

    @Test
    void wrongPasswordIsRejected() {
        found(user("s3cret!", Role.DISPATCHER, true));

        assertThatThrownBy(() -> service.login("maria@utility.com", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void unknownEmailIsRejectedAndNeverTouchesUserTable() {
        when(lookup.findActiveByEmail("nobody@utility.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login("nobody@utility.com", "whatever"))
                .isInstanceOf(InvalidCredentialsException.class);
        verifyNoInteractions(users);
    }

    @Test
    void accountWithoutPasswordCannotLogIn() {
        found(user(null, Role.DISPATCHER, true));

        assertThatThrownBy(() -> service.login("maria@utility.com", "anything"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void userMissingUnderTenantIsRejected() {
        found(null);

        assertThatThrownBy(() -> service.login("maria@utility.com", "s3cret!"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void disabledAccountWithCorrectPasswordGetsDistinctOutcome() {
        found(user("s3cret!", Role.DISPATCHER, false));

        assertThatThrownBy(() -> service.login("maria@utility.com", "s3cret!"))
                .isInstanceOf(AccountDisabledException.class);
    }

    @Test
    void disabledAccountWithWrongPasswordDoesNotRevealItIsDisabled() {
        found(user("s3cret!", Role.DISPATCHER, false));

        assertThatThrownBy(() -> service.login("maria@utility.com", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void tenantContextIsClearedAfterLoginSuccessAndFailure() {
        found(user("s3cret!", Role.DISPATCHER, true));
        service.login("maria@utility.com", "s3cret!");
        assertThatThrownBy(TenantContextHolder::getTenantId).isInstanceOf(IllegalStateException.class);

        assertThatThrownBy(() -> service.login("maria@utility.com", "wrong"))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(TenantContextHolder::getTenantId).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void currentUserReturnsSummaryForTheTokenIdentity() {
        when(users.findByIdAndTenantIdAndDeletedAtIsNull(userId, tenantId))
                .thenReturn(Optional.of(user("s3cret!", Role.SYSTEM_ADMIN, true)));

        assertThat(service.currentUser(new AuthenticatedUser(userId, tenantId, Role.SYSTEM_ADMIN)))
                .isEqualTo(new UserSummary(userId, "maria@utility.com", Role.SYSTEM_ADMIN));
        verify(lookup, never()).findActiveByEmail(any());
    }

    @Test
    void currentUserForDeletedUserIsRejected() {
        when(users.findByIdAndTenantIdAndDeletedAtIsNull(userId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.currentUser(new AuthenticatedUser(userId, tenantId, Role.OPERATOR)))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
