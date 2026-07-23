CREATE TABLE IF NOT EXISTS tour_places (
    id BIGSERIAL PRIMARY KEY,
    content_id VARCHAR(100) NOT NULL UNIQUE,
    content_type_id VARCHAR(30),
    name VARCHAR(300) NOT NULL,
    region VARCHAR(100),
    city VARCHAR(100),
    category VARCHAR(50),
    detail_category VARCHAR(100),
    area_code VARCHAR(20),
    sigungu_code VARCHAR(20),
    address VARCHAR(700),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    image_url TEXT,
    source_modified_at VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_places_region_category
    ON tour_places(region, category, active);
CREATE INDEX IF NOT EXISTS idx_tour_places_sigungu
    ON tour_places(sigungu_code);
CREATE INDEX IF NOT EXISTS idx_tour_places_location
    ON tour_places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tour_places_name
    ON tour_places(name);
