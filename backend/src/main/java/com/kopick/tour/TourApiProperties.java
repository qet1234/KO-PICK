package com.kopick.tour;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tour-api")
public record TourApiProperties(String serviceKey, String mobileApp) {}
