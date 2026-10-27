package com.eam.auth;

import com.eam.tenant.TenantContextHolder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Verifies the Bearer token, authenticates the request and binds tenant and user for the
 * duration of the request. Not a Spring bean on purpose: SecurityConfig adds it to the security
 * chain only, so the servlet container does not run it a second time.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtService jwt;

    public JwtAuthenticationFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        Optional<AuthenticatedUser> user = header != null && header.startsWith(BEARER)
                ? jwt.parse(header.substring(BEARER.length()).trim())
                : Optional.empty();
        if (user.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        AuthenticatedUser principal = user.get();
        List<SimpleGrantedAuthority> authorities = principal.role() == null
                ? List.of()
                : List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()));
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, authorities));
        TenantContextHolder.setTenantId(principal.tenantId().toString());
        TenantContextHolder.setUserId(principal.userId().toString());
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContextHolder.clear();
        }
    }
}
