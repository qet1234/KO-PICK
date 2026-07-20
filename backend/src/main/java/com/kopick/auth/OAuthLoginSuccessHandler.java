package com.kopick.auth;

import com.kopick.config.AppProperties;
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
    private final AppProperties properties;

    public OAuthLoginSuccessHandler(UserService users, AppProperties properties) {
        this.users = users;
        this.properties = properties;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException {
        if (authentication instanceof OAuth2AuthenticationToken oauth) {
            users.upsert(oauth.getAuthorizedClientRegistrationId(), oauth.getPrincipal());
        }
        response.sendRedirect(properties.frontendUrl() + "/?login=success");
    }

    public void onFailure(HttpServletResponse response, Exception error) throws IOException {
        String message = URLEncoder.encode("소셜 로그인에 실패했습니다.", StandardCharsets.UTF_8);
        response.sendRedirect(properties.frontendUrl() + "/login?auth_error=" + message);
    }
}
