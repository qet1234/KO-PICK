package com.kopick.auth;

import com.kopick.user.AppUser;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record AppUserPrincipal(
    UUID id,
    String email,
    String displayName,
    String provider,
    String role
) implements UserDetails {
    public static AppUserPrincipal from(AppUser user) {
        return new AppUserPrincipal(
            user.getId(), user.getEmail(), user.getDisplayName(), user.getProvider(), user.getRole().name()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override public String getPassword() { return ""; }
    @Override public String getUsername() { return id.toString(); }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
