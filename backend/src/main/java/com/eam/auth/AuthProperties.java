package com.eam.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "eam.auth")
public record AuthProperties(String jwtSecret, Duration tokenTtl) {
}
