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

        if (!bookingOnly && isJourneySearch(query)) {
            return journeySearch(query);
        }

        /*
         * Standard category browsing must always use Korea Tourism Organization data.
         * Kakao Local is intentionally excluded here because its 15-item search limit
         * made the UI display a false nationwide total such as "15 places / 3 pages".
         */
        return searchTourData(query);
    }

    private Map<String, Object> searchTourData(MultiValueMap<String, String> query) {
        try {
            Map<String, Object> live = tourApi.search(query);
            if (!live.containsKey("source")) live.put("source", "TOUR_API");
            live.put("authoritative", true);
            return live;
        } catch (RuntimeException liveError) {
            log.warn("TourAPI query failed. Trying the protected TourAPI database snapshot.", liveError);

            try {
                if (placeStore.hasData()) {
                    Map<String, Object> stored = new LinkedHashMap<>(placeStore.search(query));
                    if (isSubregionMode(query) || !places(stored).isEmpty()) {
                        stored.put("source", "TOUR_API_SNAPSHOT");
                        stored.put("authoritative", true);
                        stored.put("stale", true);
                        return stored;
                    }
                }
            } catch (RuntimeException storeError) {
                liveError.addSuppressed(storeError);
                log.warn("Protected TourAPI snapshot query also failed.", storeError);
            }

            throw new IllegalStateException(
                "한국관광공사 장소 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
                liveError
            );
        }
    }

    private Map<String, Object> journeySearch(MultiValueMap<String, String> query) {
        int page = Math.min(positive(first(query, "page", "1"), 1), 3);
        int pageSize = Math.min(positive(first(query, "pageSize", "12"), 12), 24);
        String region = first(query, "region", "전국");
        String city = resolveCity(region, first(query, "sigunguCode", ""));
        String journey = first(query, "journey", "");
        String selectedType = first(query, "journeyType", "전체");

        List<JourneyPreset> presets = journeyPresets(journey).stream()
            .filter(preset -> "전체".equals(selectedType) || preset.label().equals(selectedType))
            .toList();

        if (presets.isEmpty()) {
            return emptyJourneyResult(page, pageSize, journey, selectedType);
        }

        int perPresetLimit = "전체".equals(selectedType)
            ? Math.max(3, (int) Math.ceil((double) pageSize / presets.size()))
            : pageSize;
        List<Map<String, Object>> merged = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (JourneyPreset preset : presets) {
            List<Map<String, Object>> found = kakaoLocal.configured()
                ? kakaoLocal.searchPlaces(
                    region,
                    city,
                    preset.category(),
                    preset.keyword(),
                    page,
                    perPresetLimit
                )
                : fallbackJourneyPlaces(query, preset, page, perPresetLimit);

            for (Map<String, Object> place : found) {
                Map<String, Object> enriched = new LinkedHashMap<>(place);
                enriched.put("category", preset.category());
                enriched.put("detailCategory", preset.label());
                enriched.put("journey", journey);
                add(enriched, merged, seen, pageSize);
            }
        }

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("pageNo", page);
        pagination.put("numOfRows", pageSize);
        pagination.put("totalCount", merged.size());
        pagination.put("totalPages", merged.isEmpty() ? 1 : 3);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", merged);
        result.put("pagination", pagination);
        result.put("source", kakaoLocal.configured() ? "KAKAO_LOCAL_JOURNEY" : "TOUR_API_JOURNEY");
        result.put("journey", journey);
        result.put("journeyType", selectedType);
        result.put("journeyTypes", presets.stream().map(JourneyPreset::label).toList());
        return result;
    }

    private List<Map<String, Object>> fallbackJourneyPlaces(
        MultiValueMap<String, String> original,
        JourneyPreset preset,
        int page,
        int pageSize
    ) {
        MultiValueMap<String, String> presetQuery = new LinkedMultiValueMap<>();
        presetQuery.set("page", String.valueOf(page));
        presetQuery.set("pageSize", String.valueOf(pageSize));
        presetQuery.set("region", first(original, "region", "전국"));
        presetQuery.set("category", preset.category());
        presetQuery.set("detailType", preset.fallbackDetail());
        String sigunguCode = first(original, "sigunguCode", "");
        if (!sigunguCode.isBlank()) presetQuery.set("sigunguCode", sigunguCode);
        return places(searchTourData(presetQuery));
    }

    private Map<String, Object> emptyJourneyResult(
        int page,
        int pageSize,
        String journey,
        String selectedType
    ) {
        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("pageNo", page);
        pagination.put("numOfRows", pageSize);
        pagination.put("totalCount", 0);
        pagination.put("totalPages", 1);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", List.of());
        result.put("pagination", pagination);
        result.put("source", "EMPTY_JOURNEY");
        result.put("journey", journey);
        result.put("journeyType", selectedType);
        return result;
    }

    private List<JourneyPreset> journeyPresets(String journey) {
        if ("혼자".equals(journey)) {
            return List.of(
                new JourneyPreset("혼밥", "음식", "혼밥", "간편식"),
                new JourneyPreset("조용한 카페", "카페", "조용한 카페", "조용한카페"),
                new JourneyPreset("혼자 둘러보기", "관광지", "혼자 가기 좋은 관광지", "공원")
            );
        }
        if ("커플".equals(journey)) {
            return List.of(
                new JourneyPreset("카페", "카페", "데이트 카페", "감성카페"),
                new JourneyPreset("데이트 관광지", "관광지", "데이트 명소", "공원"),
                new JourneyPreset("축제", "축제", "데이트 축제", "전체"),
                new JourneyPreset("음식", "음식", "데이트 맛집", "전체")
            );
        }
        return List.of();
    }

    private boolean isJourneySearch(MultiValueMap<String, String> query) {
        String journey = first(query, "journey", "");
        return "혼자".equals(journey) || "커플".equals(journey);
    }

    private boolean isSubregionMode(MultiValueMap<String, String> query) {
        return "subregions".equals(first(query, "mode", "places"));
    }

    private String resolveCity(String region, String sigunguCode) {
        if (sigunguCode == null || sigunguCode.isBlank() || "전국".equals(region)) return "";

        MultiValueMap<String, String> subregionQuery = new LinkedMultiValueMap<>();
        subregionQuery.set("mode", "subregions");
        subregionQuery.set("region", region);
        Map<String, Object> source = searchTourData(subregionQuery);
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

    private record JourneyPreset(
        String label,
        String category,
        String keyword,
        String fallbackDetail
    ) {}
}
