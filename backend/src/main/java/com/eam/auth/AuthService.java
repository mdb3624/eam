package com.eam.auth;

import com.eam.tenant.TenantContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Locale;
import java.util.Optional;

/**
 * Login flow (see US-001 Architect Design). The pre-auth lookup only resolves email to
 * (user id, tenant id); the user row itself is read through the RLS-protected runtime role
 * after the tenant is bound.
 */
public class AuthService {

    private final LoginLookupRepository lookup;
    private final UserRepository users;
    private final JwtService jwt;
    private final PasswordEncoder encoder;
    private final AuthProperties properties;
    /** Compared against when the account does not exist, so unknown and wrong-password take similar time. */
    private final String dummyHash;

    public AuthService(LoginLookupRepository lookup, UserRepository users, JwtService jwt,
                       PasswordEncoder encoder, AuthProperties properties) {
        this.lookup = lookup;
        this.users = users;
        this.jwt = jwt;
        this.encoder = encoder;
        this.properties = properties;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    public LoginResponse login(String email, String password) {
        Optional<LoginIdentity> identity = lookup.findActiveByEmail(email.trim().toLowerCase(Locale.ROOT));
        if (identity.isEmpty()) {
            throw rejectAfterDummyCompare(password);
        }
        TenantContextHolder.setTenantId(identity.get().tenantId().toString());
        try {
            User user = users.findByIdAndTenantIdAndDeletedAtIsNull(
                    identity.get().userId(), identity.get().tenantId()).orElse(null);
            if (user == null || user.getPasswordHash() == null) {
                throw rejectAfterDummyCompare(password);
            }
            if (!encoder.matches(password, user.getPasswordHash())) {
                throw new InvalidCredentialsException();
            }
            if (!user.isEnabled()) {
                throw new AccountDisabledException();
            }
            String token = jwt.issue(new AuthenticatedUser(user.getId(), user.getTenantId(), user.getRole()));
            return new LoginResponse(token, "Bearer", properties.tokenTtl().toSeconds(), summary(user));
        } finally {
            TenantContextHolder.clear();
        }
    }

    /** Caller has already bound the tenant from a verified token. */
    public UserSummary currentUser(AuthenticatedUser principal) {
        return users.findByIdAndTenantIdAndDeletedAtIsNull(principal.userId(), principal.tenantId())
                .map(AuthService::summary)
                .orElseThrow(InvalidCredentialsException::new);
    }

    private InvalidCredentialsException rejectAfterDummyCompare(String password) {
        encoder.matches(password, dummyHash);
        return new InvalidCredentialsException();
    }

    private static UserSummary summary(User user) {
        return new UserSummary(user.getId(), user.getEmail(), user.getRole());
    }
}
