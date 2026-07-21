package com.kopick.tour;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kakao-local")
public record KakaoLocalProperties(String restApiKey) {
    public boolean configured() {
        return restApiKey != null && !restApiKey.isBlank();
    }
}
