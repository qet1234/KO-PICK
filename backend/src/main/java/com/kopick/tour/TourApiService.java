package com.kopick.tour;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Service
public class TourApiService {
    private static final String BASE = "https://apis.data.go.kr/B551011/KorService2";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int BOOKING_SCAN_PAGE_SIZE = 100;
    private static final int MAX_BOOKING_SCAN_PAGES = 5;
    private static final int BOOKING_LOOKUP_BATCH_SIZE = 24;
    private static final int BOOKING_LOOKUP_CONCURRENCY = 1;
    private static final int BOOKING_REGION_BATCH_SIZE = 4;
    private static final int BOOKING_REGION_PAGE_SIZE = 100;
    private static final int MAX_NATIONWIDE_BOOKING_SCANS_PER_REQUEST = 96;
    private static final long BOOKING_CACHE_TTL_MS = 6 * 60 * 60 * 1000L;
    private static final long EMPTY_BOOKING_CACHE_TTL_MS = 10 * 60 * 1000L;
    private static final Set<String> EMPTY_BOOKING_VALUES = Set.of(
        "", "-", "없음", "해당없음", "예약불가", "불가"
    );

    private static final Map<String, String> REGION_CODES = Map.ofEntries(
        Map.entry("서울", "1"), Map.entry("인천", "2"), Map.entry("대전", "3"),
        Map.entry("대구", "4"), Map.entry("광주", "5"), Map.entry("부산", "6"),
        Map.entry("울산", "7"), Map.entry("세종", "8"), Map.entry("경기", "31"),
        Map.entry("강원", "32"), Map.entry("충북", "33"), Map.entry("충남", "34"),
        Map.entry("경북", "35"), Map.entry("경남", "36"), Map.entry("전북", "37"),
        Map.entry("전남", "38"), Map.entry("제주", "39")
    );

    private static final Map<String, String> REGION_NAMES = Map.ofEntries(
        Map.entry("1", "서울"), Map.entry("2", "인천"), Map.entry("3", "대전"),
        Map.entry("4", "대구"), Map.entry("5", "광주"), Map.entry("6", "부산"),
        Map.entry("7", "울산"), Map.entry("8", "세종"), Map.entry("31", "경기"),
        Map.entry("32", "강원"), Map.entry("33", "충북"), Map.entry("34", "충남"),
        Map.entry("35", "경북"), Map.entry("36", "경남"), Map.entry("37", "전북"),
        Map.entry("38", "전남"), Map.entry("39", "제주")
    );
    private static final List<RegionScope> BOOKING_REGIONS = List.of(
        new RegionScope("서울", "1"), new RegionScope("부산", "6"),
        new RegionScope("대구", "4"), new RegionScope("인천", "2"),
        new RegionScope("광주", "5"), new RegionScope("대전", "3"),
        new RegionScope("울산", "7"), new RegionScope("세종", "8"),
        new RegionScope("경기", "31"), new RegionScope("강원", "32"),
        new RegionScope("충북", "33"), new RegionScope("충남", "34"),
        new RegionScope("전북", "37"), new RegionScope("전남", "38"),
        new RegionScope("경북", "35"), new RegionScope("경남", "36"),
        new RegionScope("제주", "39")
    );

    private static final Map<String, String> FOOD_CODES = Map.of(
        "한식", "A05020100", "양식", "A05020200", "일식", "A05020300",
        "중식", "A05020400", "세계음식", "A05020500"
    );
    private static final String CAFE_CODE = "A05020900";

    private static final Map<String, Map<String, List<String>>> KEYWORDS = Map.of(
        "음식", Map.of(
            "해산물", List.of("해산물", "횟집", "해물", "회"),
            "간편식", List.of("치킨", "피자", "햄버거", "분식"),
            "건강식", List.of("비건", "채식", "샐러드", "포케"),
            "주점", List.of("주점", "이자카야", "포차", "펍")
        ),
        "카페", Map.of(
            "프랜차이즈", List.of("스타벅스", "투썸플레이스", "이디야", "컴포즈커피"),
            "감성카페", List.of("감성", "한옥카페", "정원카페", "갤러리카페"),
            "뷰카페", List.of("오션뷰", "루프탑", "전망카페", "호수카페"),
            "대형카페", List.of("대형카페", "베이커리카페", "카페팩토리"),
            "조용한카페", List.of("북카페", "서재", "책방카페", "정원카페"),
            "작업하기 좋은 카페", List.of("스터디카페", "워크라운지", "북카페"),
            "이색카페", List.of("테마카페", "체험카페", "동물카페", "갤러리카페")
        ),
        "축제", Map.of(
            "계절축제", List.of("봄축제", "여름축제", "가을축제", "겨울축제"),
            "먹거리축제", List.of("먹거리축제", "음식축제", "푸드페스티벌"),
            "전통축제", List.of("전통축제", "민속축제", "문화제"),
            "문화예술축제", List.of("문화축제", "예술축제", "아트페스티벌"),
            "음악 페스티벌", List.of("음악축제", "뮤직페스티벌", "콘서트"),
            "불꽃축제", List.of("불꽃축제", "불꽃놀이"),
            "체험행사", List.of("체험축제", "체험행사", "박람회")
        ),
        "관광지", Map.of(
            "박물관", List.of("박물관", "기념관"),
            "미술관·전시관", List.of("미술관", "전시관"),
            "전시회", List.of("전시회", "특별전"),
            "공원", List.of("공원", "수목원"),
            "역사·유적", List.of("유적", "고궁", "성곽", "사적"),
            "테마파크", List.of("테마파크", "놀이공원", "아쿠아리움")
        )
    );

    private final RestClient restClient;
    private final TourApiProperties properties;
    private final Map<String, CachedBookingInfo> bookingInfoCache = new ConcurrentHashMap<>();
    private final ExecutorService bookingLookupExecutor = Executors.newFixedThreadPool(
        BOOKING_LOOKUP_CONCURRENCY,
        runnable -> {
            Thread thread = new Thread(runnable, "tour-booking-lookup");
            thread.setDaemon(true);
            return thread;
        }
    );

    public TourApiService(RestClient.Builder builder, TourApiProperties properties) {
        this.restClient = builder.build();
        this.properties = properties;
    }

    @PreDestroy
    void shutdownBookingLookupExecutor() {
        bookingLookupExecutor.shutdownNow();
    }

    public Map<String, Object> search(MultiValueMap<String, String> query) {
        requireKey();
        String region = first(query, "region", "전국");
        String areaCode = REGION_CODES.getOrDefault(region, "");
        if ("subregions".equals(first(query, "mode", "places"))) {
            return subregions(areaCode);
        }

        int page = positive(first(query, "page", "1"), 1);
        int pageSize = Math.min(positive(first(query, "pageSize", "100"), 100), MAX_PAGE_SIZE);
        String requestedCategory = first(query, "category", "전체");
        String category = Map.of("맛집", "음식", "여행지", "관광지", "문화", "관광지")
            .getOrDefault(requestedCategory, requestedCategory);
        String detail = first(query, "detailType", "전체");
        List<QuerySource> sources = sources(category, detail);
        if (sources.isEmpty()) throw new IllegalArgumentException("지원하지 않는 장소 카테고리입니다.");

        boolean bookingOnly = Boolean.parseBoolean(first(query, "bookingOnly", "false"));
        boolean keywordSearch = sources.stream().anyMatch(source -> source.keyword() != null);
        if (bookingOnly) {
            return searchBookable(query, region, areaCode, category, detail, sources, page, pageSize);
        }

        int rows = keywordSearch ? MAX_PAGE_SIZE
            : sources.size() > 1 ? Math.max(1, pageSize / sources.size()) : pageSize;
        List<JsonNode> payloads = new ArrayList<>();
        for (QuerySource source : sources) {
            payloads.add(searchPayload(
                source, query, areaCode, keywordSearch ? 1 : page, rows
            ));
        }

        List<Map<String, Object>> places = normalize(payloads, region, category, detail);
        int totalCount = keywordSearch ? places.size() : payloads.stream()
            .mapToInt(payload -> payload.path("response").path("body").path("totalCount").asInt(0)).sum();
        int totalPages = keywordSearch ? 1 : payloads.stream().mapToInt(payload -> {
            JsonNode body = payload.path("response").path("body");
            return Math.max(1, (int) Math.ceil(body.path("totalCount").asDouble(0) /
                Math.max(1, body.path("numOfRows").asInt(rows))));
        }).max().orElse(1);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", places);
        result.put("pagination", Map.of(
            "pageNo", keywordSearch ? 1 : page,
            "numOfRows", pageSize,
            "totalCount", totalCount,
            "totalPages", totalPages
        ));
        return result;
    }

    private Map<String, Object> searchBookable(
        MultiValueMap<String, String> query,
        String region,
        String areaCode,
        String category,
        String detail,
        List<QuerySource> sources,
        int page,
        int pageSize
    ) {
        if (areaCode.isBlank() && !validCoordinates(query)) {
            return searchBookableNationwide(query, category, detail, sources, page, pageSize);
        }

        int requiredMatches = page * pageSize + 1;
        int scannedCount = 0;
        boolean fullyScanned = false;
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> verified = new ArrayList<>();
        int[] sourceTotalPages = new int[sources.size()];

        for (int rawPage = 1; rawPage <= MAX_BOOKING_SCAN_PAGES; rawPage++) {
            List<JsonNode> payloads = new ArrayList<>();
            boolean requestedAnySource = false;

            for (int sourceIndex = 0; sourceIndex < sources.size(); sourceIndex++) {
                if (sourceTotalPages[sourceIndex] > 0 && rawPage > sourceTotalPages[sourceIndex]) continue;

                JsonNode payload = searchPayload(
                    sources.get(sourceIndex), query, areaCode, rawPage, BOOKING_SCAN_PAGE_SIZE
                );
                payloads.add(payload);
                requestedAnySource = true;

                JsonNode body = payload.path("response").path("body");
                int totalCount = body.path("totalCount").asInt(0);
                int rows = Math.max(1, body.path("numOfRows").asInt(BOOKING_SCAN_PAGE_SIZE));
                sourceTotalPages[sourceIndex] = Math.max(1, (int) Math.ceil(totalCount / (double) rows));
            }

            if (!requestedAnySource) {
                fullyScanned = true;
                break;
            }

            List<Map<String, Object>> candidates = normalize(payloads, region, category, detail).stream()
                .filter(place -> seen.add(String.valueOf(place.getOrDefault("id", ""))))
                .toList();
            for (int batchStart = 0; batchStart < candidates.size(); batchStart += BOOKING_LOOKUP_BATCH_SIZE) {
                int batchEnd = Math.min(batchStart + BOOKING_LOOKUP_BATCH_SIZE, candidates.size());
                List<Map<String, Object>> candidateBatch = candidates.subList(batchStart, batchEnd);
                scannedCount += candidateBatch.size();
                verified.addAll(lookupBookingInfo(candidateBatch).stream()
                    .filter(place -> Boolean.TRUE.equals(place.get("bookingAvailable")))
                    .toList());
                if (verified.size() >= requiredMatches) break;
            }

            fullyScanned = true;
            for (int totalPages : sourceTotalPages) {
                if (totalPages == 0 || rawPage < totalPages) {
                    fullyScanned = false;
                    break;
                }
            }
            if (verified.size() >= requiredMatches || fullyScanned) break;
        }

        int offset = Math.min((page - 1) * pageSize, verified.size());
        int end = Math.min(offset + pageSize, verified.size());
        List<Map<String, Object>> places = verified.subList(offset, end);
        boolean hasNextPage = verified.size() > end || !fullyScanned;
        int totalPages = fullyScanned
            ? Math.max(1, (int) Math.ceil(verified.size() / (double) pageSize))
            : Math.max(page + (hasNextPage ? 1 : 0), 1);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", places);
        result.put("pagination", Map.of(
            "pageNo", page,
            "numOfRows", pageSize,
            "totalCount", verified.size(),
            "totalPages", totalPages
        ));
        result.put("bookingFilter", Map.of(
            "verifiedCount", verified.size(),
            "scannedCount", scannedCount,
            "fullyScanned", fullyScanned,
            "criterion", "TOUR_API_RESERVATION_INFO"
        ));
        return result;
    }

    private Map<String, Object> searchBookableNationwide(
        MultiValueMap<String, String> query,
        String category,
        String detail,
        List<QuerySource> sources,
        int page,
        int pageSize
    ) {
        int requiredMatches = page * pageSize + 1;
        int scannedCount = 0;
        boolean fullyScanned = false;
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> verified = new ArrayList<>();
        int sourceRows = Math.max(1, BOOKING_REGION_PAGE_SIZE / sources.size());

        nationwideScan:
        for (int regionStart = 0; regionStart < BOOKING_REGIONS.size(); regionStart += BOOKING_REGION_BATCH_SIZE) {
            int regionEnd = Math.min(regionStart + BOOKING_REGION_BATCH_SIZE, BOOKING_REGIONS.size());
            List<CompletableFuture<RegionCandidates>> regionLookups = BOOKING_REGIONS
                .subList(regionStart, regionEnd)
                .stream()
                .map(scope -> CompletableFuture.supplyAsync(() -> {
                    List<JsonNode> payloads = sources.stream()
                        .map(source -> searchPayload(source, query, scope.code(), 1, sourceRows))
                        .toList();
                    return new RegionCandidates(
                        scope,
                        normalize(payloads, scope.name(), category, detail)
                    );
                }, bookingLookupExecutor))
                .toList();

            List<RegionCandidates> regionCandidates = regionLookups.stream()
                .map(CompletableFuture::join)
                .toList();
            List<Map<String, Object>> candidates = interleaveRegionCandidates(regionCandidates, seen);

            for (int batchStart = 0; batchStart < candidates.size(); batchStart += BOOKING_LOOKUP_BATCH_SIZE) {
                int remainingScanCapacity = MAX_NATIONWIDE_BOOKING_SCANS_PER_REQUEST - scannedCount;
                if (remainingScanCapacity <= 0) break nationwideScan;
                int batchEnd = Math.min(
                    Math.min(batchStart + BOOKING_LOOKUP_BATCH_SIZE, candidates.size()),
                    batchStart + remainingScanCapacity
                );
                List<Map<String, Object>> candidateBatch = candidates.subList(batchStart, batchEnd);
                scannedCount += candidateBatch.size();
                verified.addAll(lookupBookingInfo(candidateBatch).stream()
                    .filter(place -> Boolean.TRUE.equals(place.get("bookingAvailable")))
                    .toList());
                if (verified.size() >= requiredMatches) break;
            }

            fullyScanned = regionEnd >= BOOKING_REGIONS.size();
            if (verified.size() >= requiredMatches) break;
            if (scannedCount >= MAX_NATIONWIDE_BOOKING_SCANS_PER_REQUEST) break;
        }

        int offset = Math.min((page - 1) * pageSize, verified.size());
        int end = Math.min(offset + pageSize, verified.size());
        List<Map<String, Object>> places = verified.subList(offset, end);
        boolean hasNextPage = verified.size() > end || !fullyScanned;
        int totalPages = fullyScanned
            ? Math.max(1, (int) Math.ceil(verified.size() / (double) pageSize))
            : Math.max(page + (hasNextPage ? 1 : 0), 1);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("places", places);
        result.put("pagination", Map.of(
            "pageNo", page,
            "numOfRows", pageSize,
            "totalCount", verified.size(),
            "totalPages", totalPages
        ));
        result.put("bookingFilter", Map.of(
            "verifiedCount", verified.size(),
            "scannedCount", scannedCount,
            "fullyScanned", fullyScanned,
            "criterion", "TOUR_API_RESERVATION_INFO"
        ));
        return result;
    }

    private List<Map<String, Object>> interleaveRegionCandidates(
        List<RegionCandidates> regionCandidates,
        Set<String> seen
    ) {
        int maxSize = regionCandidates.stream()
            .mapToInt(group -> group.candidates().size())
            .max()
            .orElse(0);
        List<Map<String, Object>> interleaved = new ArrayList<>();
        for (int candidateIndex = 0; candidateIndex < maxSize; candidateIndex++) {
            for (RegionCandidates group : regionCandidates) {
                if (candidateIndex >= group.candidates().size()) continue;
                Map<String, Object> place = group.candidates().get(candidateIndex);
                if (seen.add(String.valueOf(place.getOrDefault("id", "")))) {
                    interleaved.add(place);
                }
            }
        }
        return interleaved;
    }

    private List<Map<String, Object>> lookupBookingInfo(List<Map<String, Object>> candidates) {
        List<CompletableFuture<Map<String, Object>>> lookups = candidates.stream()
            .map(place -> CompletableFuture.supplyAsync(
                () -> withBookingInfo(place), bookingLookupExecutor
            ))
            .toList();
        return lookups.stream().map(CompletableFuture::join).toList();
    }

    private JsonNode searchPayload(
        QuerySource source,
        MultiValueMap<String, String> query,
        String areaCode,
        int page,
        int rows
    ) {
        MultiValueMap<String, String> params = common();
        params.set("pageNo", String.valueOf(page));
        params.set("numOfRows", String.valueOf(rows));
        params.set("arrange", "Q");
        put(params, "areaCode", areaCode);
        if (!areaCode.isBlank()) put(params, "sigunguCode", first(query, "sigunguCode", ""));
        put(params, "contentTypeId", source.contentTypeId());
        put(params, "cat1", source.cat1());
        put(params, "cat3", source.cat3());

        String path;
        if (source.keyword() != null) {
            params.set("keyword", source.keyword());
            path = "searchKeyword2";
        } else if (validCoordinates(query)) {
            params.set("mapX", first(query, "lng", ""));
            params.set("mapY", first(query, "lat", ""));
            params.set("radius", String.valueOf(Math.min(20000, positive(first(query, "radius", "10000"), 10000))));
            params.set("arrange", "E");
            path = "locationBasedList2";
        } else {
            path = "areaBasedList2";
        }
        return request(path, params);
    }

    private Map<String, Object> subregions(String areaCode) {
        if (areaCode.isBlank()) return Map.of("subregions", List.of());
        MultiValueMap<String, String> params = common();
        params.set("areaCode", areaCode);
        params.set("pageNo", "1");
        params.set("numOfRows", "100");
        List<Map<String, String>> result = items(request("areaCode2", params)).stream()
            .map(item -> Map.of("code", text(item, "code"), "name", text(item, "name")))
            .filter(item -> !item.get("code").isBlank() && !item.get("name").isBlank())
            .toList();
        return Map.of("subregions", result);
    }

    private List<Map<String, Object>> normalize(
        List<JsonNode> payloads,
        String fallbackRegion,
        String category,
        String detail
    ) {
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> places = new ArrayList<>();
        for (JsonNode payload : payloads) {
            for (JsonNode item : items(payload)) {
                String id = text(item, "contentid");
                String name = text(item, "title");
                if (id.isBlank() || name.isBlank() || !seen.add(id)) continue;
                if ("음식".equals(category) && "전체".equals(detail) && CAFE_CODE.equals(text(item, "cat3"))) continue;
                double latitude = number(item, "mapy");
                double longitude = number(item, "mapx");
                if (latitude < 32 || latitude > 39.8 || longitude < 124 || longitude > 132) continue;

                String address = (text(item, "addr1") + " " + text(item, "addr2")).trim();
                String region = REGION_NAMES.getOrDefault(text(item, "areacode"), firstWord(address, fallbackRegion));
                String itemCategory = category;
                if ("전체".equals(category)) {
                    itemCategory = CAFE_CODE.equals(text(item, "cat3")) ? "카페" : switch (text(item, "contenttypeid")) {
                        case "12", "14" -> "관광지";
                        case "15" -> "축제";
                        case "39" -> "음식";
                        default -> "기타";
                    };
                } else if (!"전체".equals(detail)) {
                    itemCategory = category + " · " + detail;
                }
                String image = firstNonBlank(text(item, "firstimage"), text(item, "firstimage2"));
                if (image != null && image.startsWith("http:")) image = "https:" + image.substring(5);

                Map<String, Object> place = new LinkedHashMap<>();
                place.put("id", id);
                place.put("name", name);
                place.put("region", region);
                place.put("city", secondWord(address));
                place.put("category", itemCategory);
                place.put("address", address.isBlank() ? null : address);
                place.put("latitude", latitude);
                place.put("longitude", longitude);
                place.put("imageUrl", image);
                place.put("contentTypeId", text(item, "contenttypeid"));
                places.add(place);
            }
        }
        return places;
    }

    private List<QuerySource> sources(String category, String detail) {
        if ("전체".equals(category)) {
            return List.of(new QuerySource("12", null, null, null), new QuerySource("14", null, null, null),
                new QuerySource("15", null, null, null), new QuerySource("39", null, null, null));
        }
        if ("음식".equals(category)) {
            if (FOOD_CODES.containsKey(detail)) return List.of(new QuerySource("39", null, FOOD_CODES.get(detail), null));
            return keywordSources("39", null, null, KEYWORDS.get("음식").get(detail), List.of(new QuerySource("39", null, null, null)));
        }
        if ("카페".equals(category)) {
            return keywordSources("39", null, CAFE_CODE, KEYWORDS.get("카페").get(detail),
                List.of(new QuerySource("39", null, CAFE_CODE, null)));
        }
        if ("축제".equals(category)) {
            return keywordSources("15", null, null, KEYWORDS.get("축제").get(detail),
                List.of(new QuerySource("15", null, null, null)));
        }
        if ("관광지".equals(category)) {
            if ("자연명소".equals(detail)) return List.of(new QuerySource("12", "A01", null, null));
            String type = List.of("박물관", "미술관·전시관", "전시회").contains(detail) ? "14" : "12";
            return keywordSources(type, null, null, KEYWORDS.get("관광지").get(detail),
                List.of(new QuerySource("12", null, null, null), new QuerySource("14", null, null, null)));
        }
        return List.of();
    }

    private Map<String, Object> withBookingInfo(Map<String, Object> place) {
        String contentId = String.valueOf(place.getOrDefault("id", ""));
        String contentTypeId = String.valueOf(place.getOrDefault("contentTypeId", ""));
        BookingInfo bookingInfo = bookingInfo(contentId, contentTypeId);

        Map<String, Object> enriched = new LinkedHashMap<>(place);
        enriched.put("bookingAvailable", bookingInfo.available());
        if (bookingInfo.available()) {
            enriched.put("bookingKind", bookingInfo.kind());
            enriched.put("bookingInfo", bookingInfo.description());
        }
        return enriched;
    }

    private BookingInfo bookingInfo(String contentId, String contentTypeId) {
        if (contentId.isBlank() || contentTypeId.isBlank()) return BookingInfo.unavailable();

        String cacheKey = contentTypeId + ":" + contentId;
        CachedBookingInfo cached = bookingInfoCache.get(cacheKey);
        long now = System.currentTimeMillis();
        if (cached != null && cached.expiresAt() > now) return cached.info();

        BookingInfo info;
        try {
            info = fetchBookingInfo(contentId, contentTypeId);
        } catch (RuntimeException error) {
            return BookingInfo.unavailable();
        }
        long ttl = info.available() ? BOOKING_CACHE_TTL_MS : EMPTY_BOOKING_CACHE_TTL_MS;
        bookingInfoCache.put(cacheKey, new CachedBookingInfo(info, now + ttl));
        return info;
    }

    private BookingInfo fetchBookingInfo(String contentId, String contentTypeId) {
        MultiValueMap<String, String> params = common();
        params.set("contentId", contentId);
        params.set("contentTypeId", contentTypeId);

        List<JsonNode> introItems = items(request("detailIntro2", params));
        if (introItems.isEmpty()) return BookingInfo.unavailable();

        JsonNode intro = introItems.get(0);
        for (Map.Entry<String, String> field : Map.of(
            "reservationfood", "예약 안내",
            "bookingplace", "예매처",
            "reservation", "예약 안내"
        ).entrySet()) {
            String description = cleanBookingText(text(intro, field.getKey()));
            if (isBookableDescription(description)) {
                return new BookingInfo(true, field.getValue(), description);
            }
        }
        return BookingInfo.unavailable();
    }

    private String cleanBookingText(String value) {
        return value
            .replaceAll("<[^>]+>", " ")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private boolean isBookableDescription(String description) {
        String normalized = description.replaceAll("\\s+", "");
        if (EMPTY_BOOKING_VALUES.contains(normalized)) return false;
        return !normalized.contains("예약불가") && !normalized.contains("예매불가");
    }

    private List<QuerySource> keywordSources(
        String type, String cat1, String cat3, List<String> keywords, List<QuerySource> fallback
    ) {
        if (keywords == null) return fallback;
        return keywords.stream().map(keyword -> new QuerySource(type, cat1, cat3, keyword)).toList();
    }

    private JsonNode request(String path, MultiValueMap<String, String> params) {
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE + "/" + path)
            .queryParams(params).build().encode().toUri();
        JsonNode payload = restClient.get().uri(uri).retrieve().body(JsonNode.class);
        if (payload == null || !"0000".equals(payload.path("response").path("header").path("resultCode").asText())) {
            String message = payload == null ? "TourAPI 응답이 없습니다."
                : payload.path("response").path("header").path("resultMsg").asText("TourAPI 요청에 실패했습니다.");
            throw new IllegalStateException(message);
        }
        return payload;
    }

    private List<JsonNode> items(JsonNode payload) {
        JsonNode value = payload.path("response").path("body").path("items").path("item");
        if (value.isArray()) {
            List<JsonNode> result = new ArrayList<>();
            value.forEach(result::add);
            return result;
        }
        return value.isObject() ? List.of(value) : List.of();
    }

    private MultiValueMap<String, String> common() {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.set("serviceKey", decodedServiceKey());
        params.set("MobileOS", "ETC");
        params.set("MobileApp", properties.mobileApp());
        params.set("_type", "json");
        return params;
    }

    private String decodedServiceKey() {
        String key = properties.serviceKey();
        if (key == null || !key.contains("%")) return key;
        try {
            return URLDecoder.decode(key, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException error) {
            return key;
        }
    }

    private void requireKey() {
        if (properties.serviceKey() == null || properties.serviceKey().isBlank()) {
            throw new IllegalStateException("TOUR_API_SERVICE_KEY가 설정되지 않았습니다.");
        }
    }

    private boolean validCoordinates(MultiValueMap<String, String> query) {
        try {
            return Double.isFinite(Double.parseDouble(first(query, "lat", "")))
                && Double.isFinite(Double.parseDouble(first(query, "lng", "")));
        } catch (NumberFormatException error) {
            return false;
        }
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

    private void put(MultiValueMap<String, String> params, String key, String value) {
        if (value != null && !value.isBlank()) params.set(key, value);
    }

    private String text(JsonNode node, String field) { return node.path(field).asText("").trim(); }
    private double number(JsonNode node, String field) {
        try { return Double.parseDouble(text(node, field)); } catch (NumberFormatException error) { return Double.NaN; }
    }
    private String firstWord(String value, String fallback) {
        return value.isBlank() ? fallback : value.split("\\s+")[0];
    }
    private String secondWord(String value) {
        String[] words = value.split("\\s+");
        return words.length > 1 ? words[1] : null;
    }
    private String firstNonBlank(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return null;
    }

    private record QuerySource(String contentTypeId, String cat1, String cat3, String keyword) {}
    private record RegionScope(String name, String code) {}
    private record RegionCandidates(RegionScope scope, List<Map<String, Object>> candidates) {}
    private record BookingInfo(boolean available, String kind, String description) {
        private static BookingInfo unavailable() {
            return new BookingInfo(false, "", "");
        }
    }
    private record CachedBookingInfo(BookingInfo info, long expiresAt) {}
}
