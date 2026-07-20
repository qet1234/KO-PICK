package com.kopick.user;

import com.kopick.auth.AppUserPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final AppUserRepository users;

    public UserService(AppUserRepository users) {
        this.users = users;
    }

    @Transactional
    public AppUser resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("로그인이 필요합니다.");
        }

        if (authentication.getPrincipal() instanceof AppUserPrincipal principal) {
            return users.findById(principal.id())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("회원정보를 찾을 수 없습니다."));
        }

        if (authentication instanceof OAuth2AuthenticationToken oauth) {
            return upsert(oauth.getAuthorizedClientRegistrationId(), oauth.getPrincipal());
        }

        throw new AuthenticationCredentialsNotFoundException("지원하지 않는 인증 정보입니다.");
    }

    @Transactional
    public AppUser upsert(String provider, OAuth2User principal) {
        Profile profile = Profile.from(provider, principal.getAttributes());
        AppUser user = users.findByProviderAndProviderUserId(provider, profile.id())
            .orElseGet(() -> AppUser.create(
                provider, profile.id(), profile.email(), profile.name(), profile.imageUrl()
            ));
        user.updateProfile(profile.email(), profile.name(), profile.imageUrl());
        return users.save(user);
    }

    public AppUser require(UUID id) {
        return users.findById(id).filter(AppUser::isActive)
            .orElseThrow(() -> new IllegalStateException("회원정보를 찾을 수 없습니다."));
    }

    @Transactional
    public void delete(AppUser user) {
        users.delete(user);
    }

    private record Profile(String id, String email, String name, String imageUrl) {
        @SuppressWarnings("unchecked")
        static Profile from(String provider, Map<String, Object> source) {
            Map<String, Object> attributes = source;
            if ("naver".equals(provider) && source.get("response") instanceof Map<?, ?> response) {
                attributes = (Map<String, Object>) response;
            }

            if ("kakao".equals(provider)) {
                String id = String.valueOf(source.get("id"));
                Map<String, Object> account = source.get("kakao_account") instanceof Map<?, ?> value
                    ? (Map<String, Object>) value : Map.of();
                Map<String, Object> profile = account.get("profile") instanceof Map<?, ?> value
                    ? (Map<String, Object>) value : Map.of();
                return new Profile(
                    id,
                    string(account.get("email")),
                    first(string(profile.get("nickname")), "카카오 사용자"),
                    string(profile.get("profile_image_url"))
                );
            }

            String id = first(string(attributes.get("sub")), string(attributes.get("id")));
            return new Profile(
                id,
                string(attributes.get("email")),
                first(string(attributes.get("name")), string(attributes.get("nickname")), "KO-PICK 사용자"),
                first(string(attributes.get("picture")), string(attributes.get("profile_image")))
            );
        }

        private static String string(Object value) {
            return value == null ? null : String.valueOf(value).trim();
        }

        private static String first(String... values) {
            for (String value : values) {
                if (value != null && !value.isBlank() && !"null".equals(value)) return value;
            }
            return null;
        }
    }
}
