import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class TourApiBuildPatch {
    public static void main(String[] args) throws Exception {
        Path sourcePath = Path.of("src/main/java/com/kopick/tour/TourApiService.java");
        String source = Files.readString(sourcePath, StandardCharsets.UTF_8);

        source = replaceRequired(
            source,
            "import java.net.URLDecoder;",
            "import java.net.URLDecoder;\nimport java.net.URLEncoder;"
        );

        source = replaceRequired(
            source,
            """
    private JsonNode request(String path, MultiValueMap<String, String> params) {
        URI uri = UriComponentsBuilder.fromHttpUrl(BASE + "/" + path)
            .queryParams(params).build().encode().toUri();
        JsonNode payload = restClient.get().uri(uri).retrieve().body(JsonNode.class);
""",
            """
    private JsonNode request(String path, MultiValueMap<String, String> params) {
        String encodedQuery = UriComponentsBuilder.fromHttpUrl(BASE + "/" + path)
            .queryParams(params)
            .build()
            .encode()
            .toUriString();
        URI uri = URI.create(encodedQuery + (encodedQuery.contains("?") ? "&" : "?")
            + "serviceKey=" + encodedServiceKey());
        JsonNode payload = restClient.get().uri(uri).retrieve().body(JsonNode.class);
"""
        );

        source = replaceRequired(
            source,
            """
    private MultiValueMap<String, String> common() {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.set("serviceKey", decodedServiceKey());
        params.set("MobileOS", "ETC");
""",
            """
    private MultiValueMap<String, String> common() {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.set("MobileOS", "ETC");
"""
        );

        source = replaceRequired(
            source,
            """
    private String decodedServiceKey() {
        String key = properties.serviceKey();
        if (key == null || !key.contains("%")) return key;
        try {
            return URLDecoder.decode(key, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException error) {
            return key;
        }
    }
""",
            """
    private String encodedServiceKey() {
        String key = properties.serviceKey();
        if (key == null) return "";

        key = key.trim();
        if ((key.startsWith("\\\"") && key.endsWith("\\\""))
            || (key.startsWith("'") && key.endsWith("'"))) {
            key = key.substring(1, key.length() - 1).trim();
        }
        if (key.startsWith("serviceKey=")) {
            key = key.substring("serviceKey=".length()).trim();
        }

        // Render values may contain the decoding key, the encoding key, or a
        // value copied after an additional URL-encoding pass. Decode until the
        // value stabilizes, then encode exactly once for the outgoing query.
        for (int attempt = 0; attempt < 3 && key.contains("%"); attempt++) {
            try {
                String decoded = URLDecoder.decode(key, StandardCharsets.UTF_8);
                if (decoded.equals(key)) break;
                key = decoded;
            } catch (IllegalArgumentException error) {
                break;
            }
        }

        return URLEncoder.encode(key, StandardCharsets.UTF_8).replace("+", "%20");
    }
"""
        );

        Files.writeString(sourcePath, source, StandardCharsets.UTF_8);
        System.out.println("Applied TourAPI service-key encoding fix.");
    }

    private static String replaceRequired(String source, String oldValue, String newValue) {
        if (!source.contains(oldValue)) {
            throw new IllegalStateException("TourApiService source layout changed; required patch target was not found.");
        }
        return source.replace(oldValue, newValue);
    }
}
