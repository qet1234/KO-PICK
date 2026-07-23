package com.kopick.tour;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "tour_places")
public class TourPlace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_id", nullable = false, unique = true, length = 100)
    private String contentId;

    @Column(name = "content_type_id", length = 30)
    private String contentTypeId;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(length = 100)
    private String region;

    @Column(length = 100)
    private String city;

    @Column(length = 50)
    private String category;

    @Column(name = "detail_category", length = 100)
    private String detailCategory;

    @Column(name = "area_code", length = 20)
    private String areaCode;

    @Column(name = "sigungu_code", length = 20)
    private String sigunguCode;

    @Column(length = 700)
    private String address;

    private Double latitude;
    private Double longitude;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "source_modified_at", length = 30)
    private String sourceModifiedAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_synced_at", nullable = false)
    private OffsetDateTime lastSyncedAt = OffsetDateTime.now();

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public Long getId() { return id; }
    public String getContentId() { return contentId; }
    public void setContentId(String contentId) { this.contentId = contentId; }
    public String getContentTypeId() { return contentTypeId; }
    public void setContentTypeId(String contentTypeId) { this.contentTypeId = contentTypeId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDetailCategory() { return detailCategory; }
    public void setDetailCategory(String detailCategory) { this.detailCategory = detailCategory; }
    public String getAreaCode() { return areaCode; }
    public void setAreaCode(String areaCode) { this.areaCode = areaCode; }
    public String getSigunguCode() { return sigunguCode; }
    public void setSigunguCode(String sigunguCode) { this.sigunguCode = sigunguCode; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getSourceModifiedAt() { return sourceModifiedAt; }
    public void setSourceModifiedAt(String sourceModifiedAt) { this.sourceModifiedAt = sourceModifiedAt; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(OffsetDateTime lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
