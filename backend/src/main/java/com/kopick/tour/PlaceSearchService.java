package com.kopick.tour;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Service
public class PlaceSearchService {
    private static final Logger log = LoggerFactory.getLogger(PlaceSearchService.class);

    private final TourApiService tourApi;
    private final TourPlaceStoreService placeStore;
    private final KakaoLocalService kakaoLocal;

    public PlaceSearchService(
        TourApiService tourApi,
        TourPlaceStoreService placeStore,
        KakaoLocalService kakaoLocal
    ) {
        this.tourApi = tourApi;
        this.placeStore = placeStore;
        this.kakaoLocal = kakaoLocal;
    }

    public Map<String, Object> search(MultiValueMap<String, String> query) {
        boolean bookingOnly = Boolean.parseBoolean(first(query, "bookingOnly", "false"));
        Map<String, Object> tourResult;

        if (bookingOnly) {
            tourResult = tourApi.search(query);
        } else {
            tourResult = searchWithFallbacks(query);
        }

        if (bookingOnly
            || !isFranchiseCafe(query)
            || !kakaoLocal.configured()) return tourResult;

        int page = positive(first(query, "page", "1"), 1);
        int pageSize = Math.min(positive(first(query, "pageSize", "12"), 12), 100);
        String region = first(query, "region", "전국");
        String city = resolveCity(region, first(query, "sigunguCode", ""));

        List<Map<String, Object>> tourPlaces = places(tourResult);
        List<Map<String, Object>> kakaoPlaces = kakaoLocal.franchiseCafes(region, city, page, pageSize);
        List<Map<String, Object>> merged = merge(tourPlaces, kakaoPlaces, pageSize);

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("pageNo", page);
        pagination.put("numOfRows", pageSize);
        pagination.put("totalCount", Math.max(merged.size(), totalCount(tourResult)));
        pagination.put("totalPages", Math.max(1, totalPages(tourResult)));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", merged);
        result.put("pagination", pagination);
        result.put("sources", List.of(sourceName(tourResult), "KAKAO_LOCAL"));
        return result;
    }

    private Map<String, Object> searchWithFallbacks(MultiValueMap<String, String> query) {
        try {
            if (placeStore.hasData()) {
                Map<String, Object> stored = placeStore.search(query);
                if (isSubregionMode(query) || !places(stored).isEmpty()) return stored;
            }
        } catch (RuntimeException error) {
            log.warn("Tour place database query failed. Falling back to TourAPI.", error);
        }

        try {
            Map<String, Object> live = tourApi.search(query);
            if (!live.containsKey("source")) live.put("source", "TOUR_API");
            return live;
        } catch (RuntimeException error) {
            log.warn("TourAPI place query failed. Falling back to Kakao Local.", error);
        }

        if (isSubregionMode(query)) {
            return Map.of("subregions", List.of(), "source", "EMPTY_FALLBACK");
        }

        return kakaoFallback(query);
    }

    private Map<String, Object> kakaoFallback(MultiValueMap<String, String> query) {
        int page = positive(first(query, "page", "1"), 1);
        int pageSize = Math.min(positive(first(query, "pageSize", "15"), 15), 15);
        String region = first(query, "region", "전국");
        String category = first(query, "category", "전체");
        String detail = first(query, "detailType", "전체");
        String city = "";

        List<Map<String, Object>> fallbackPlaces = kakaoLocal.searchPlaces(
            region,
            city,
            category,
            detail,
            page,
            pageSize
        );

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("pageNo", page);
        pagination.put("numOfRows", pageSize);
        pagination.put("totalCount", fallbackPlaces.size());
        pagination.put("totalPages", fallbackPlaces.isEmpty() ? 1 : 3);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", fallbackPlaces);
        result.put("pagination", pagination);
        result.put("source", "KAKAO_LOCAL");
        result.put("fallback", true);
        return result;
    }

    private boolean isSubregionMode(MultiValueMap<String, String> query) {
        return "subregions".equals(first(query, "mode", "places"));
    }

    private String sourceName(Map<String, Object> result) {
        Object source = result.get("source");
        return source == null ? "TOUR_API" : String.valueOf(source);
    }

    private boolean isFranchiseCafe(MultiValueMap<String, String> query) {
        return "카페".equals(first(query, "category", ""))
            && "프랜차이즈".equals(first(query, "detailType", ""))
            && !"subregions".equals(first(query, "mode", "places"));
    }

    private String resolveCity(String region, String sigunguCode) {
        if (sigunguCode == null || sigunguCode.isBlank() || "전국".equals(region)) return "";

        MultiValueMap<String, String> subregionQuery = new LinkedMultiValueMap<>();
        subregionQuery.set("mode", "subregions");
        subregionQuery.set("region", region);
        Map<String, Object> source = searchWithFallbacks(subregionQuery);
        Object raw = source.get("subregions");
        if (!(raw instanceof List<?> list)) return "";

        for (Object value : list) {
            if (!(value instanceof Map<?, ?> item)) continue;
            if (sigunguCode.equals(String.valueOf(item.get("code")))) {
                return String.valueOf(item.get("name"));
            }
        }
        return "";
    }

    private List<Map<String, Object>> merge(
        List<Map<String, Object>> tourPlaces,
        List<Map<String, Object>> kakaoPlaces,
        int limit
    ) {
        List<Map<String, Object>> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (Map<String, Object> place : tourPlaces) add(place, result, seen, limit);
        for (Map<String, Object> place : kakaoPlaces) add(place, result, seen, limit);
        return result;
    }

    private void add(
        Map<String, Object> place,
        List<Map<String, Object>> result,
        Set<String> seen,
        int limit
    ) {
        if (result.size() >= limit) return;
        String name = normalize(String.valueOf(place.getOrDefault("name", "")));
        String address = normalize(String.valueOf(place.getOrDefault("address", "")));
        String key = name + "|" + address;
        if (name.isBlank() || !seen.add(key)) return;
        result.add(place);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> places(Map<String, Object> result) {
        Object value = result.get("places");
        return value instanceof List<?> ? (List<Map<String, Object>>) value : List.of();
    }

    private int totalCount(Map<String, Object> result) {
        return paginationNumber(result, "totalCount", places(result).size());
    }

    private int totalPages(Map<String, Object> result) {
        return paginationNumber(result, "totalPages", 1);
    }

    private int paginationNumber(Map<String, Object> result, String key, int fallback) {
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
        try {
            int parsed = Integer.parseInt(value);
            return parsed > 0 ? parsed : fallback;
        } catch (NumberFormatException error) {
            return fallback;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("[^0-9A-Za-z가-힣]", "").toLowerCase();
    }
}
