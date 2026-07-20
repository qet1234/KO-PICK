package com.kopick.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    private UUID id;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_user_id", nullable = false)
    private String providerUserId;

    private String email;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AppUser() {}

    public static AppUser create(
        String provider,
        String providerUserId,
        String email,
        String displayName,
        String imageUrl
    ) {
        AppUser user = new AppUser();
        user.id = UUID.randomUUID();
        user.provider = provider;
        user.providerUserId = providerUserId;
        user.updateProfile(email, displayName, imageUrl);
        return user;
    }

    public void updateProfile(String email, String displayName, String imageUrl) {
        this.email = email;
        this.displayName = displayName == null || displayName.isBlank() ? "KO-PICK 사용자" : displayName;
        this.imageUrl = imageUrl;
        this.active = true;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getProvider() { return provider; }
    public String getProviderUserId() { return providerUserId; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getImageUrl() { return imageUrl; }
    public UserRole getRole() { return role; }
    public boolean isActive() { return active; }
}
