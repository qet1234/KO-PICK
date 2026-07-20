package com.kopick.auth;

import com.kopick.config.AppProperties;
import com.kopick.user.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final AppProperties properties;
    private final SecretKey key;

    public JwtService(AppProperties properties) {
        this.properties = properties;
        byte[] secret = properties.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(secret);
    }

    public String issueAccessToken(AppUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .issuer(properties.jwt().issuer())
            .subject(user.getId().toString())
            .claim("role", user.getRole().name())
            .claim("provider", user.getProvider())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(properties.jwt().accessTtl())))
            .signWith(key)
            .compact();
    }

    public UUID parseUserId(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(key)
            .requireIssuer(properties.jwt().issuer())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return UUID.fromString(claims.getSubject());
    }

    public long accessExpiresInSeconds() {
        return properties.jwt().accessTtl().toSeconds();
    }
}
