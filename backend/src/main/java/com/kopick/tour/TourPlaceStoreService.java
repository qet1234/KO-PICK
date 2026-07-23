package com.kopick.tour;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Service
public class TourPlaceStoreService {
    private final TourPlaceRepository repository;
    private final TourApiService tourApi;

    public TourPlaceStoreService(TourPlaceRepository repository, TourApiService tourApi) {
        this.repository = repository;
        this.tourApi = tourApi;
    }

    /**
     * The public place explorer must always use the live Korea Tourism Organization
     * TourAPI result as its canonical source. The local table is only a recoverable
     * cache/snapshot and must never replace the original count or category result.
     */
    public boolean hasData() {
        return false;
    }

    public Map<String, Object> search(MultiValueMap<String, String> query) {
        String region = first(query, "region", "전국");
        if ("subregions".equals(first(query, "mode", "places"))) {
            List<Map<String, String>> subregions = repository.findSubregions(region).stream()
                .map(row -> Map.of("code", String.valueOf(row[0]), "name", String.valueOf(row[1])))
                .toList();
            return Map.of("subregions", subregions, "source", "DATABASE_SNAPSHOT");
        }

        int requestedPage = positive(first(query, "page", "1"), 1);
        int pageSize = Math.min(positive(first(query, "pageSize", "100"), 100), 100);
        String category = normalizeCategory(first(query, "category", "전체"));
        String sigunguCode = first(query, "sigunguCode", "");
        String detail = first(query, "detailType", "전체");

        Page<TourPlace> page = repository.search(
            region,
            category,
            sigunguCode,
            detail,
            PageRequest.of(requestedPage - 1, pageSize)
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", page.getContent().stream().map(this::toResponse).toList());
        result.put("pagination", Map.of(
            "pageNo", requestedPage,
            "numOfRows", pageSize,
            "totalCount", page.getTotalElements(),
            "totalPages", Math.max(1, page.getTotalPages())
        ));
        result.put("source", "DATABASE_SNAPSHOT");
        return result;
    }

    /**
     * Rebuilds the snapshot from TourAPI in one transaction. If any page fails,
     * the transaction rolls back so a partial category data set is never exposed.
     */
    @Transactional
    public int syncAll() {
        List<TourPlace> synchronizedPlaces = new ArrayList<>();

        for (String category : List.of("음식", "카페", "축제", "관광지")) {
            int page = 1;
            int totalPages = 1;
            do {
                MultiValueMap<String, String> query = new LinkedMultiValueMap<>();
                query.set("region", "전국");
                query.set("category", category);
                query.set("page", String.valueOf(page));
                query.set("pageSize", "100");

                Map<String, Object> result = tourApi.search(query);
                collectPlaces(result, category, synchronizedPlaces);
                totalPages = paginationInt(result, "totalPages", 1);
                page++;
            } while (page <= totalPages);
        }

        repository.deleteAllInBatch();
        repository.saveAll(synchronizedPlaces);
        return synchronizedPlaces.size();
    }

    private void collectPlaces(
        Map<String, Object> result,
        String category,
        List<TourPlace> destination
    ) {
        Object raw = result.get("places");
        if (!(raw instanceof List<?> values)) return;

        OffsetDateTime now = OffsetDateTime.now();
        for (Object value : values) {
            if (!(value instanceof Map<?, ?> map)) continue;
            String contentId = text(map, "id");
            String name = text(map, "name");
            if (contentId.isBlank() || name.isBlank()) continue;

            TourPlace place = new TourPlace();
            place.setContentId(contentId);
            place.setContentTypeId(text(map, "contentTypeId"));
            place.setName(name);
            place.setRegion(text(map, "region"));
            place.setCity(text(map, "city"));
            place.setCategory(category);
            place.setDetailCategory(text(map, "detailCategory"));
            place.setAreaCode(text(map, "areaCode"));
            place.setSigunguCode(text(map, "sigunguCode"));
            place.setAddress(text(map, "address"));
            place.setLatitude(number(map.get("latitude")));
            place.setLongitude(number(map.get("longitude")));
            place.setImageUrl(text(map, "imageUrl"));
            place.setSourceModifiedAt(text(map, "modifiedTime"));
            place.setActive(true);
            place.setLastSyncedAt(now);
            place.setUpdatedAt(now);
            destination.add(place);
        }
    }

    private Map<String, Object> toResponse(TourPlace place) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", place.getContentId());
        response.put("contentTypeId", place.getContentTypeId());
        response.put("name", place.getName());
        response.put("region", place.getRegion());
        response.put("city", place.getCity());
        response.put("category", place.getCategory());
        response.put("detailCategory", place.getDetailCategory());
        response.put("areaCode", place.getAreaCode());
        response.put("sigunguCode", place.getSigunguCode());
        response.put("address", place.getAddress());
        response.put("latitude", place.getLatitude());
        response.put("longitude", place.getLongitude());
        response.put("imageUrl", place.getImageUrl());
        return response;
    }

    private String normalizeCategory(String value) {
        return Map.of("맛집", "음식", "여행지", "관광지", "문화", "관광지")
            .getOrDefault(value, value);
    }

    private String text(Map<?, ?> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private Double number(Object value) {
        if (value == null) return null;
        try { return Double.valueOf(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }

    private int paginationInt(Map<String, Object> result, String key, int fallback) {
        Object pagination = result.get("pagination");
        if (!(pagination instanceof Map<?, ?> map)) return fallback;
        Object value = map.get(key);
        return value instanceof Number number ? number.intValue() : fallback;
    }

    private String first(MultiValueMap<String, String> map, String key, String fallback) {
        String value = map.getFirst(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private int positive(String value, int fallback) {
        try { int parsed = Integer.parseInt(value); return parsed > 0 ? parsed : fallback; }
        catch (NumberFormatException ignored) { return fallback; }
    }
}
