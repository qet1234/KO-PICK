package com.kopick.tour;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class KakaoLocalService {
    private static final String KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
    private static final List<String> FRANCHISE_BRANDS = List.of(
        "스타벅스", "투썸플레이스", "이디야", "컴포즈커피", "메가MGC커피",
        "빽다방", "더벤티", "할리스", "커피빈", "폴바셋", "파스쿠찌", "엔제리너스"
    );

    private final RestClient restClient;
    private final KakaoLocalProperties properties;

    public KakaoLocalService(RestClient.Builder builder, KakaoLocalProperties properties) {
        this.restClient = builder.build();
        this.properties = properties;
    }

    public boolean configured() {
        return properties.configured();
    }

    public List<Map<String, Object>> franchiseCafes(
        String region,
        String city,
        int page,
        int requestedSize
    ) {
        if (!configured()) return List.of();

        int kakaoPage = Math.max(1, Math.min(page, 3));
        int targetSize = Math.max(1, Math.min(requestedSize, 100));
        String location = String.join(" ", List.of(region, city == null ? "" : city)).trim();
        Set<String> seen = new HashSet<>();
        List<Map<String, Object>> result = new ArrayList<>();

        for (String brand : FRANCHISE_BRANDS) {
            if (result.size() >= targetSize) break;
            String query = (location + " " + brand).trim();
            JsonNode payload = request(query, kakaoPage);
            for (JsonNode document : payload.path("documents")) {
                String id = text(document, "id");
                String name = text(document, "place_name");
                String categoryCode = text(document, "category_group_code");
                if (id.isBlank() || name.isBlank() || !"CE7".equals(categoryCode)) continue;
                if (!containsBrand(name, brand) || !seen.add(id)) continue;

                String address = firstNonBlank(
                    text(document, "road_address_name"),
                    text(document, "address_name")
                );
                if (!matchesLocation(address, region, city)) continue;

                double latitude = number(document, "y");
                double longitude = number(document, "x");
                if (!Double.isFinite(latitude) || !Double.isFinite(longitude)) continue;

                Map<String, Object> place = new LinkedHashMap<>();
                place.put("id", "kakao:" + id);
                place.put("name", name);
                place.put("region", firstWord(address, region));
                place.put("city", secondWord(address));
                place.put("category", "카페 · 프랜차이즈");
                place.put("address", address.isBlank() ? null : address);
                place.put("latitude", latitude);
                place.put("longitude", longitude);
                place.put("imageUrl", null);
                place.put("placeUrl", text(document, "place_url"));
                place.put("source", "KAKAO_LOCAL");
                result.add(place);

                if (result.size() >= targetSize) break;
            }
        }

        return result;
    }

    private JsonNode request(String query, int page) {
        URI uri = UriComponentsBuilder.fromHttpUrl(KEYWORD_URL)
            .queryParam("query", query)
            .queryParam("category_group_code", "CE7")
            .queryParam("page", page)
            .queryParam("size", 15)
            .queryParam("sort", "accuracy")
            .build()
            .encode()
            .toUri();

        try {
            JsonNode payload = restClient.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + properties.restApiKey().trim())
                .retrieve()
                .body(JsonNode.class);
            return payload == null ? com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode() : payload;
        } catch (RuntimeException error) {
            return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        }
    }

    private boolean containsBrand(String name, String brand) {
        String normalizedName = normalize(name);
        String normalizedBrand = normalize(brand);
        if (normalizedName.contains(normalizedBrand)) return true;
        return "메가MGC커피".equals(brand) && normalizedName.contains("메가커피");
    }

    private boolean matchesLocation(String address, String region, String city) {
        if (address == null || address.isBlank()) return "전국".equals(region);
        if (!"전국".equals(region) && !address.startsWith(region) && !address.contains(region)) return false;
        return city == null || city.isBlank() || "전체".equals(city) || address.contains(city);
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("[^0-9A-Za-z가-힣]", "").toLowerCase();
    }

    private String text(JsonNode node, String field) {
        return node.path(field).asText("").trim();
    }

    private double number(JsonNode node, String field) {
        try {
            return Double.parseDouble(text(node, field));
        } catch (NumberFormatException error) {
            return Double.NaN;
        }
    }

    private String firstWord(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.split("\\s+")[0];
    }

    private String secondWord(String value) {
        if (value == null || value.isBlank()) return null;
        String[] words = value.split("\\s+");
        return words.length > 1 ? words[1] : null;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }
}
