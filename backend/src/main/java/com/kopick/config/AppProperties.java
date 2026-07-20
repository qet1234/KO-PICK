package com.kopick.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String frontendUrl,
    List<String> allowedOrigins,
    Jwt jwt,
    Cookie cookie
) {
    public record Jwt(String secret, Duration accessTtl, Duration refreshTtl, String issuer) {}
    public record Cookie(boolean secure, String sameSite, String domain) {}
}
