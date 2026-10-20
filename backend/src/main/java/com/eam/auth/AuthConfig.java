package com.eam.auth;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    JwtService jwtService(AuthProperties properties) {
        return new JwtService(properties);
    }

    @Bean
    LoginLookupRepository loginLookupRepository(@Qualifier("loginLookupDataSource") DataSource dataSource) {
        return new LoginLookupRepository(new JdbcTemplate(dataSource));
    }

    @Bean
    AuthService authService(LoginLookupRepository lookup, UserRepository users, JwtService jwt,
                            PasswordEncoder encoder, AuthProperties properties) {
        return new AuthService(lookup, users, jwt, encoder, properties);
    }
}
