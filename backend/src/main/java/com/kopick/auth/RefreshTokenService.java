package com.kopick.auth;

import com.kopick.config.AppProperties;
import com.kopick.user.AppUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository tokens;
    private final AppProperties properties;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository tokens, AppProperties properties) {
        this.tokens = tokens;
        this.properties = properties;
    }

    @Transactional
    public IssuedRefreshToken issue(AppUser user) {
        String raw = randomToken();
        RefreshToken entity = tokens.save(new RefreshToken(
            user, hash(raw), Instant.now().plus(properties.jwt().refreshTtl())
        ));
        return new IssuedRefreshToken(raw, entity);
    }

    @Transactional(noRollbackFor = RefreshTokenReuseException.class)
    public Rotation rotate(String rawToken) {
        RefreshToken current = tokens.findByTokenHash(hash(rawToken))
            .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 Refresh Token입니다."));
        Instant now = Instant.now();

        if (current.isRevoked()) {
            tokens.revokeAll(current.getUser(), now);
            throw new RefreshTokenReuseException(
                "Refresh Token 재사용이 감지되어 모든 세션을 폐기했습니다."
            );
        }
        if (current.isExpiredAt(now) || !current.getUser().isActive()) {
            throw new IllegalArgumentException("Refresh Token이 만료되었거나 사용할 수 없습니다.");
        }

        IssuedRefreshToken next = issue(current.getUser());
        current.revoke(next.entity().getId());
        return new Rotation(current.getUser(), next.raw());
    }

    @Transactional
    public void revoke(String rawToken) {
        tokens.findByTokenHash(hash(rawToken)).ifPresent(token -> token.revoke(null));
    }

    @Transactional
    public void revokeAll(AppUser user) {
        tokens.revokeAll(user, Instant.now());
    }

    private String randomToken() {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", error);
        }
    }

    public static class RefreshTokenReuseException extends IllegalArgumentException {
        public RefreshTokenReuseException(String message) {
            super(message);
        }
    }

    public record IssuedRefreshToken(String raw, RefreshToken entity) {}
    public record Rotation(AppUser user, String raw) {}
}
