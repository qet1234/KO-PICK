package com.kopick.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.kopick.config.AppProperties;
import com.kopick.user.AppUser;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
    @Test
    void issuesAndValidatesAccessToken() {
        AppProperties properties = new AppProperties(
            "http://localhost:3000",
            List.of("http://localhost:3000"),
            new AppProperties.Jwt(
                "test-secret-that-is-definitely-longer-than-32-bytes",
                Duration.ofMinutes(15),
                Duration.ofDays(14),
                "KO-PICK"
            ),
            new AppProperties.Cookie(false, "Lax", "")
        );
        AppUser user = AppUser.create("google", "google-1", "user@example.com", "테스트", null);
        JwtService jwt = new JwtService(properties);

        String token = jwt.issueAccessToken(user);

        assertThat(jwt.parseUserId(token)).isEqualTo(user.getId());
        assertThat(jwt.accessExpiresInSeconds()).isEqualTo(900);
    }
}
