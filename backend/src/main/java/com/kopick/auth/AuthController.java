package com.kopick.auth;

import com.kopick.config.AppProperties;
import com.kopick.user.AppUser;
import com.kopick.user.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "KOPICK_REFRESH";

    private final UserService users;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final AppProperties properties;

    public AuthController(
        UserService users,
        JwtService jwt,
        RefreshTokenService refreshTokens,
        AppProperties properties
    ) {
        this.users = users;
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
        this.properties = properties;
    }

    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @GetMapping("/me")
    UserResponse me(Authentication authentication) {
        return UserResponse.from(users.resolve(authentication));
    }

    @PostMapping("/token")
    ResponseEntity<TokenResponse> issue(Authentication authentication) {
        AppUser user = users.resolve(authentication);
        RefreshTokenService.IssuedRefreshToken refresh = refreshTokens.issue(user);
        return withRefreshCookie(refresh.raw(), tokenResponse(user));
    }

    @PostMapping("/refresh")
    ResponseEntity<TokenResponse> refresh(HttpServletRequest request) {
        String raw = cookie(request, REFRESH_COOKIE);
        if (raw == null) throw new IllegalArgumentException("Refresh Token이 없습니다.");
        RefreshTokenService.Rotation rotation = refreshTokens.rotate(raw);
        return withRefreshCookie(rotation.raw(), tokenResponse(rotation.user()));
    }

    @PostMapping("/refresh-token")
    BrowserTokenResponse refreshBrowserToken(@RequestBody BrowserTokenRequest request) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw new IllegalArgumentException("Refresh Token이 없습니다.");
        }
        RefreshTokenService.Rotation rotation = refreshTokens.rotate(request.refreshToken());
        TokenResponse access = tokenResponse(rotation.user());
        return new BrowserTokenResponse(
            access.accessToken(),
            rotation.raw(),
            access.tokenType(),
            access.expiresIn()
        );
    }

    @PostMapping("/logout-token")
    Map<String, Boolean> logoutBrowserToken(@RequestBody BrowserTokenRequest request) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            refreshTokens.revoke(request.refreshToken());
        }
        return Map.of("success", true);
    }

    @PostMapping("/logout")
    ResponseEntity<Map<String, Boolean>> logout(
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        String raw = cookie(request, REFRESH_COOKIE);
        if (raw != null) refreshTokens.revoke(raw);
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString());
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            ResponseCookie.from("KOPICK_SESSION", "")
                .httpOnly(true)
                .secure(properties.cookie().secure())
                .sameSite(properties.cookie().sameSite())
                .path("/")
                .maxAge(Duration.ZERO)
                .build()
                .toString()
        );
        return ResponseEntity.ok(Map.of("success", true));
    }

    private TokenResponse tokenResponse(AppUser user) {
        return new TokenResponse(jwt.issueAccessToken(user), "Bearer", jwt.accessExpiresInSeconds());
    }

    private ResponseEntity<TokenResponse> withRefreshCookie(String raw, TokenResponse body) {
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie(raw).toString())
            .body(body);
    }

    private ResponseCookie refreshCookie(String value) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, value)
            .httpOnly(true)
            .secure(properties.cookie().secure())
            .sameSite(properties.cookie().sameSite())
            .path("/api/auth")
            .maxAge(properties.jwt().refreshTtl());
        if (properties.cookie().domain() != null && !properties.cookie().domain().isBlank()) {
            builder.domain(properties.cookie().domain());
        }
        return builder.build();
    }

    private ResponseCookie clearRefreshCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_COOKIE, "")
            .httpOnly(true)
            .secure(properties.cookie().secure())
            .sameSite(properties.cookie().sameSite())
            .path("/api/auth")
            .maxAge(Duration.ZERO);
        if (properties.cookie().domain() != null && !properties.cookie().domain().isBlank()) {
            builder.domain(properties.cookie().domain());
        }
        return builder.build();
    }

    private String cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(cookie -> name.equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }

    public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}

    public record BrowserTokenRequest(String refreshToken) {}

    public record BrowserTokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
    ) {}

    public record UserResponse(
        String id,
        String email,
        String displayName,
        String imageUrl,
        String provider,
        String role
    ) {
        static UserResponse from(AppUser user) {
            return new UserResponse(
                user.getId().toString(), user.getEmail(), user.getDisplayName(), user.getImageUrl(),
                user.getProvider(), user.getRole().name()
            );
        }
    }
}
