package com.kopick.auth;

import com.kopick.config.AppProperties;
import com.kopick.user.AppUser;
import com.kopick.user.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuthLoginSuccessHandler implements AuthenticationSuccessHandler {
    private final UserService users;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final AppProperties properties;

    public OAuthLoginSuccessHandler(
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

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauth)) {
            onFailure(response, new IllegalStateException("OAuth 인증 정보가 없습니다."));
            return;
        }

        AppUser user = users.upsert(
            oauth.getAuthorizedClientRegistrationId(),
            oauth.getPrincipal()
        );
        RefreshTokenService.IssuedRefreshToken refresh = refreshTokens.issue(user);
        String accessToken = jwt.issueAccessToken(user);

        // The frontend and API currently use different registrable domains. Mobile Safari
        // blocks the API session cookie in that third-party context, so hand off bearer
        // credentials in the URL fragment. Fragments are not sent in HTTP requests and the
        // frontend removes them immediately after storing the tokens in sessionStorage.
        String fragment = "access_token=" + encode(accessToken)
            + "&refresh_token=" + encode(refresh.raw())
            + "&expires_in=" + jwt.accessExpiresInSeconds();
        response.sendRedirect(properties.frontendUrl() + "/?login=success#" + fragment);
    }

    public void onFailure(HttpServletResponse response, Exception error) throws IOException {
        String message = encode("소셜 로그인에 실패했습니다.");
        response.sendRedirect(properties.frontendUrl() + "/login?auth_error=" + message);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
