package com.kopick.trending;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class TrendingController {
    private static final Set<String> EVENT_TYPES = Set.of("view", "detail", "outbound", "favorite");
    private static final List<String> FALLBACK_KEYWORDS = List.of(
        "서울 데이트", "부산 관광지", "제주 카페", "수원 음식", "비 오는 날", "주말 나들이"
    );

    private final JdbcTemplate jdbc;
    private final String keywordSalt;

    public TrendingController(
        JdbcTemplate jdbc,
        @Value("${app.keyword-hash-salt:korea-pick}") String keywordSalt
    ) {
        this.jdbc = jdbc;
        this.keywordSalt = keywordSalt;
    }

    @GetMapping("/trending-places")
    public Map<String, Object> places() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList("""
                select place_id, name, region, city, category, address, image_url, score,
                       view_count, detail_count, outbound_count, favorite_count, updated_at
                  from public.live_trending_places
                 order by score desc, updated_at desc
                 limit 4
                """);
            int rank = 1;
            for (Map<String, Object> row : rows) result.add(place(row, rank++, "activity"));
        } catch (DataAccessException ignored) {
            // 초기 데이터 마이그레이션 전에는 안전한 기본 카드를 사용합니다.
        }
        if (result.isEmpty()) result.addAll(fallbackPlaces());
        return Map.of(
            "updatedAt", Instant.now(),
            "realtimeEnabled", !"fallback".equals(result.get(0).get("source")),
            "places", result
        );
    }

    @PostMapping("/trending-places")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> recordPlace(@RequestBody Map<String, Object> body) {
        String type = clean(body.get("eventType"), 20);
        String id = clean(body.get("id"), 120);
        String name = clean(body.get("name"), 160);
        String visitor = clean(body.get("visitorId"), 100);
        if (!EVENT_TYPES.contains(type) || id.isBlank() || name.isBlank() || visitor.isBlank()) {
            throw new IllegalArgumentException("필수 장소 정보가 없습니다.");
        }
        try {
            jdbc.update("""
                insert into public.place_activity
                    (place_id, name, region, city, category, address, image_url,
                     event_type, visitor_id, event_bucket)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict do nothing
                """,
                id, name, fallback(clean(body.get("region"), 80), "전국"), nullable(body.get("city"), 80),
                fallback(clean(body.get("category"), 80), "기타"), nullable(body.get("address"), 300),
                nullable(body.get("imageUrl"), 1000), type, visitor,
                System.currentTimeMillis() / (15 * 60 * 1000)
            );
        } catch (DataAccessException error) {
            throw new IllegalStateException("실시간 인기 데이터 테이블을 확인해 주세요.");
        }
        return Map.of("ok", true);
    }

    @GetMapping("/trending-keywords")
    public Map<String, Object> keywords() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "select * from public.get_live_trending_keywords(?, ?)", 30, 6
            );
            int index = 0;
            for (Map<String, Object> row : rows) {
                int rank = integer(row.get("current_rank"), index + 1);
                Integer previous = row.get("previous_rank") == null
                    ? null : integer(row.get("previous_rank"), rank);
                String trend = previous == null ? "new"
                    : previous > rank ? "up" : previous < rank ? "down" : "same";
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", row.get("keyword"));
                item.put("keyword", row.get("keyword"));
                item.put("rank", rank);
                item.put("previousRank", previous);
                item.put("trend", trend);
                item.put("change", previous == null ? 0 : Math.abs(previous - rank));
                item.put("searchCount", number(row.get("search_count")));
                item.put("currentScore", number(row.get("current_score")));
                item.put("previousScore", number(row.get("previous_score")));
                result.add(item);
                index++;
            }
        } catch (DataAccessException ignored) {
            // 함수 적용 전에는 기본 검색어를 사용합니다.
        }
        boolean realtime = !result.isEmpty();
        if (!realtime) result = fallbackKeywords();
        return Map.of("updatedAt", Instant.now(), "realtimeEnabled", realtime, "keywords", result);
    }

    @PostMapping("/trending-keywords")
    public Map<String, Object> recordKeyword(@RequestBody Map<String, Object> body) {
        String keyword = clean(body.get("keyword"), 60).replaceAll("\\s+", " ");
        String visitor = clean(body.get("visitorId"), 100);
        String source = "trend".equals(body.get("source")) ? "trend" : "search";
        if (keyword.length() < 2 || visitor.isBlank()) {
            throw new IllegalArgumentException("검색어 정보가 부족합니다.");
        }
        try {
            int changed = jdbc.update("""
                insert into public.keyword_search_events
                    (keyword, visitor_key, source, event_bucket)
                values (?, ?, ?, ?)
                on conflict do nothing
                """, keyword, sha256(visitor + ":" + keywordSalt), source,
                System.currentTimeMillis() / (5 * 60 * 1000));
            return Map.of("ok", true, "deduplicated", changed == 0);
        } catch (DataAccessException error) {
            throw new IllegalStateException("검색 활동 데이터 테이블을 확인해 주세요.");
        }
    }

    private Map<String, Object> place(Map<String, Object> row, int rank, String source) {
        String category = String.valueOf(row.getOrDefault("category", "기타"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", row.get("place_id"));
        result.put("rank", rank);
        result.put("category", category);
        result.put("location", (String.valueOf(row.getOrDefault("region", "전국")) + " "
            + (row.get("city") == null ? "" : row.get("city"))).trim());
        result.put("title", row.get("name"));
        result.put("description", row.get("address") == null
            ? "장소 정보와 위치를 확인해 보세요." : row.get("address"));
        result.put("imageUrl", row.get("image_url"));
        result.put("icon", icon(category));
        result.put("popularityScore", number(row.get("score")));
        result.put("viewCount", number(row.get("view_count")));
        result.put("detailCount", number(row.get("detail_count")));
        result.put("outboundCount", number(row.get("outbound_count")));
        result.put("favoriteCount", number(row.get("favorite_count")));
        result.put("source", source);
        return result;
    }

    private List<Map<String, Object>> fallbackPlaces() {
        return List.of(
            fallbackPlace("fallback-cafe", 1, "카페", "부산 해운대", "해운대 오션뷰 루프탑 카페", "☕"),
            fallbackPlace("fallback-festival", 2, "축제", "경기 수원", "수원화성 야간 문화축제", "🎆"),
            fallbackPlace("fallback-tour", 3, "관광지", "제주 서귀포", "애월 해안도로 드라이브", "🚋"),
            fallbackPlace("fallback-food", 4, "음식", "서울 성동구", "성수동 분위기 좋은 맛집", "🍜")
        );
    }

    private Map<String, Object> fallbackPlace(
        String id, int rank, String category, String location, String title, String icon
    ) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id); item.put("rank", rank); item.put("category", category);
        item.put("location", location); item.put("title", title);
        item.put("description", "실시간 장소 데이터를 준비하고 있습니다.");
        item.put("imageUrl", null); item.put("icon", icon); item.put("popularityScore", 0);
        item.put("viewCount", 0); item.put("detailCount", 0); item.put("outboundCount", 0);
        item.put("favoriteCount", 0); item.put("source", "fallback");
        return item;
    }

    private List<Map<String, Object>> fallbackKeywords() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < FALLBACK_KEYWORDS.size(); i++) {
            result.add(Map.of(
                "id", "fallback-" + (i + 1), "keyword", FALLBACK_KEYWORDS.get(i),
                "rank", i + 1, "previousRank", i + 1, "trend", "same", "change", 0,
                "searchCount", 0
            ));
        }
        return result;
    }

    private String clean(Object value, int max) {
        if (value == null) return "";
        String text = String.valueOf(value).trim();
        return text.substring(0, Math.min(text.length(), max));
    }
    private String nullable(Object value, int max) {
        String text = clean(value, max); return text.isBlank() ? null : text;
    }
    private String fallback(String value, String defaultValue) { return value.isBlank() ? defaultValue : value; }
    private int integer(Object value, int defaultValue) {
        try { return Integer.parseInt(String.valueOf(value)); } catch (Exception error) { return defaultValue; }
    }
    private double number(Object value) {
        try { return Double.parseDouble(String.valueOf(value)); } catch (Exception error) { return 0; }
    }
    private String icon(String category) {
        if (category.contains("카페")) return "☕";
        if (category.contains("축제")) return "🎆";
        if (category.contains("음식") || category.contains("맛집")) return "🍜";
        return "🚋";
    }
    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
