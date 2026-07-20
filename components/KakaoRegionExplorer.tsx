"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";

type KakaoLatLng = object;

interface KakaoMapInstance {
  panTo(position: KakaoLatLng): void;
  setLevel(level: number): void;
  setBounds(bounds: KakaoLatLngBounds): void;
  addControl(control: object, position: unknown): void;
}

interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void;
}

interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
}

interface KakaoInfoWindowInstance {
  open(
    map: KakaoMapInstance,
    marker: KakaoMarkerInstance
  ): void;
  close(): void;
}

interface KakaoClustererInstance {
  addMarkers(markers: KakaoMarkerInstance[]): void;
  clear(): void;
}

interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (
    latitude: number,
    longitude: number
  ) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
    }
  ) => KakaoMapInstance;
  Marker: new (options: {
    position: KakaoLatLng;
  }) => KakaoMarkerInstance;
  InfoWindow: new (options: {
    content: HTMLElement;
    removable?: boolean;
  }) => KakaoInfoWindowInstance;
  MarkerClusterer: new (options: {
    map: KakaoMapInstance;
    averageCenter?: boolean;
    minLevel?: number;
    disableClickZoom?: boolean;
    styles?: Array<Record<string, string>>;
  }) => KakaoClustererInstance;
  MapTypeControl: new () => object;
  ZoomControl: new () => object;
  ControlPosition: {
    TOPRIGHT: unknown;
    RIGHT: unknown;
  };
  event: {
    addListener(
      target: object,
      eventName: string,
      callback: () => void
    ): void;
  };
}

type KakaoWindow = Window & {
  kakao?: {
    maps: KakaoMapsApi;
  };
};

interface Place {
  id: number | string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  imageUrl?: string | null;
}

type PlaceCategory = "전체" | "음식" | "카페" | "축제" | "관광지";

const categories: PlaceCategory[] = [
  "전체",
  "음식",
  "카페",
  "축제",
  "관광지",
];

const categoryDetails: Record<Exclude<PlaceCategory, "전체">, string[]> = {
  음식: [
    "전체",
    "한식",
    "일식",
    "중식",
    "양식",
    "세계음식",
    "해산물",
    "간편식",
    "건강식",
    "주점",
  ],
  카페: [
    "전체",
    "프랜차이즈",
    "감성카페",
    "뷰카페",
    "대형카페",
    "조용한카페",
    "작업하기 좋은 카페",
    "이색카페",
  ],
  축제: [
    "전체",
    "지역축제",
    "계절축제",
    "먹거리축제",
    "전통축제",
    "문화예술축제",
    "음악 페스티벌",
    "불꽃축제",
    "체험행사",
  ],
  관광지: [
    "전체",
    "박물관",
    "미술관·전시관",
    "전시회",
    "공원",
    "자연명소",
    "역사·유적",
    "테마파크",
  ],
};

type RegionName =
  | "전국"
  | "서울"
  | "부산"
  | "대구"
  | "인천"
  | "광주"
  | "대전"
  | "울산"
  | "세종"
  | "경기"
  | "강원"
  | "충북"
  | "충남"
  | "전북"
  | "전남"
  | "경북"
  | "경남"
  | "제주";

interface RegionConfig {
  latitude: number;
  longitude: number;
  level: number;
  aliases: string[];
}

const regions: Record<RegionName, RegionConfig> = {
  전국: {
    latitude: 36.35,
    longitude: 127.85,
    level: 13,
    aliases: [],
  },
  서울: {
    latitude: 37.5665,
    longitude: 126.978,
    level: 8,
    aliases: ["서울", "서울특별시"],
  },
  부산: {
    latitude: 35.1796,
    longitude: 129.0756,
    level: 8,
    aliases: ["부산", "부산광역시"],
  },
  대구: {
    latitude: 35.8714,
    longitude: 128.6014,
    level: 8,
    aliases: ["대구", "대구광역시"],
  },
  인천: {
    latitude: 37.4563,
    longitude: 126.7052,
    level: 8,
    aliases: ["인천", "인천광역시"],
  },
  광주: {
    latitude: 35.1595,
    longitude: 126.8526,
    level: 8,
    aliases: ["광주", "광주광역시"],
  },
  대전: {
    latitude: 36.3504,
    longitude: 127.3845,
    level: 8,
    aliases: ["대전", "대전광역시"],
  },
  울산: {
    latitude: 35.5384,
    longitude: 129.3114,
    level: 8,
    aliases: ["울산", "울산광역시"],
  },
  세종: {
    latitude: 36.4801,
    longitude: 127.289,
    level: 8,
    aliases: ["세종", "세종특별자치시"],
  },
  경기: {
    latitude: 37.4138,
    longitude: 127.5183,
    level: 11,
    aliases: ["경기", "경기도"],
  },
  강원: {
    latitude: 37.8228,
    longitude: 128.1555,
    level: 11,
    aliases: [
      "강원",
      "강원도",
      "강원특별자치도",
    ],
  },
  충북: {
    latitude: 36.6357,
    longitude: 127.4917,
    level: 10,
    aliases: ["충북", "충청북도"],
  },
  충남: {
    latitude: 36.6588,
    longitude: 126.6728,
    level: 10,
    aliases: ["충남", "충청남도"],
  },
  전북: {
    latitude: 35.8203,
    longitude: 127.1088,
    level: 10,
    aliases: [
      "전북",
      "전라북도",
      "전북특별자치도",
    ],
  },
  전남: {
    latitude: 34.8161,
    longitude: 126.463,
    level: 10,
    aliases: ["전남", "전라남도"],
  },
  경북: {
    latitude: 36.576,
    longitude: 128.5056,
    level: 10,
    aliases: ["경북", "경상북도"],
  },
  경남: {
    latitude: 35.2383,
    longitude: 128.6924,
    level: 10,
    aliases: ["경남", "경상남도"],
  },
  제주: {
    latitude: 33.4996,
    longitude: 126.5312,
    level: 10,
    aliases: [
      "제주",
      "제주도",
      "제주특별자치도",
    ],
  },
};

function placeMatchesSelection(
  place: Place,
  regionName: RegionName,
  subregion: string
) {
  if (regionName === "전국") {
    return true;
  }

  const region = regions[regionName];

  if (!region.aliases.includes(place.region)) {
    return false;
  }

  if (subregion === "전체") {
    return true;
  }

  return place.city === subregion;
}
export default function KakaoRegionExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const clustererRef =
    useRef<KakaoClustererInstance | null>(null);
  const infoWindowRef =
    useRef<KakaoInfoWindowInstance | null>(null);

  const [selectedRegion, setSelectedRegion] =
    useState<RegionName>("전국");
  const [selectedSubregion, setSelectedSubregion] =
    useState("전체");
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategory>("전체");
  const [selectedDetail, setSelectedDetail] =
    useState("전체");
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState("");
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(() =>
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
      ? ""
      : "카카오 지도 API 키가 설정되지 않았습니다."
  );
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [subregionOptions, setSubregionOptions] = useState<
    Array<{ code: string; name: string }>
  >([]);

  const availableSubregions = useMemo(
    () => subregionOptions.map((option) => option.name),
    [subregionOptions]
  );

  const availableDetails =
    selectedCategory === "전체"
      ? []
      : categoryDetails[selectedCategory];

  const filteredPlaces = places;

  useEffect(() => {
    let cancelled = false;

    async function loadSubregions() {
      if (selectedRegion === "전국") {
        setSubregionOptions([]);
        return;
      }

      try {
        const response = await fetch(
          `${springApiUrl}/api/public/tour/places?mode=subregions&region=${encodeURIComponent(selectedRegion)}`
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "세부 지역 조회에 실패했습니다.");
        if (!cancelled) setSubregionOptions(payload.subregions ?? []);
      } catch (error) {
        console.error("TourAPI 세부 지역 조회 오류:", error);
        if (!cancelled) setSubregionOptions([]);
      }
    }

    loadSubregions();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlaces() {
      setPlacesLoading(true);
      setPlacesError("");

      try {
        const selectedSubregionCode =
          selectedSubregion === "전체"
            ? ""
            : subregionOptions.find((option) => option.name === selectedSubregion)?.code ?? "";

        const params = new URLSearchParams({
          page: String(page),
          pageSize: "100",
          region: selectedRegion,
          category: selectedCategory,
        });

        if (selectedSubregionCode) {
          params.set("sigunguCode", selectedSubregionCode);
        }

        if (selectedDetail !== "전체") {
          params.set("detailType", selectedDetail);
        }

        const response = await fetch(`${springApiUrl}/api/public/tour/places?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "추천 장소를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setPlaces((payload.places ?? []) as Place[]);
          setTotalCount(Number(payload.pagination?.totalCount ?? 0));
          setTotalPages(Math.max(1, Number(payload.pagination?.totalPages ?? 1)));
        }
      } catch (error) {
        console.error("TourAPI places 조회 오류:", error);
        if (!cancelled) {
          setPlaces([]);
          setTotalCount(0);
          setTotalPages(1);
          setPlacesError(
            error instanceof Error ? error.message : "추천 장소를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    }

    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    selectedRegion,
    selectedSubregion,
    selectedCategory,
    selectedDetail,
    subregionOptions,
  ]);

  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

    if (!apiKey) {
      return;
    }

    const initializeMap = () => {
      const kakao =
        (window as KakaoWindow).kakao;

      if (!kakao?.maps) {
        setMapError(
          "카카오 지도 SDK를 불러오지 못했습니다."
        );
        return;
      }

      kakao.maps.load(() => {
        if (!containerRef.current || mapRef.current) {
          return;
        }

        const initial = regions.전국;
        const center = new kakao.maps.LatLng(
          initial.latitude,
          initial.longitude
        );

        const map = new kakao.maps.Map(
          containerRef.current,
          {
            center,
            level: initial.level,
          }
        );

        map.addControl(
          new kakao.maps.MapTypeControl(),
          kakao.maps.ControlPosition.TOPRIGHT
        );

        map.addControl(
          new kakao.maps.ZoomControl(),
          kakao.maps.ControlPosition.RIGHT
        );

        const clusterer =
          new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 7,
            disableClickZoom: false,
            styles: [
              {
                width: "46px",
                height: "46px",
                background: "#ff3b3b",
                border: "3px solid #ffffff",
                borderRadius: "50%",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "900",
                textAlign: "center",
                lineHeight: "40px",
                boxShadow:
                  "0 6px 18px rgba(0,0,0,0.22)",
              },
            ],
          });

        mapRef.current = map;
        clustererRef.current = clusterer;
        setReady(true);
      });
    };

    if ((window as KakaoWindow).kakao?.maps) {
      initializeMap();
      return;
    }

    const existingScript =
      document.querySelector<HTMLScriptElement>(
        'script[data-kakao-map-sdk="true"]'
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        initializeMap,
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");

    script.dataset.kakaoMapSdk = "true";
    script.async = true;
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js" +
      `?appkey=${apiKey}` +
      "&autoload=false&libraries=services,clusterer";

    script.addEventListener(
      "load",
      initializeMap,
      { once: true }
    );

    script.addEventListener(
      "error",
      () =>
        setMapError(
          "카카오 지도 연결에 실패했습니다."
        ),
      { once: true }
    );

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const kakao =
      (window as KakaoWindow).kakao;
    const map = mapRef.current;
    const clusterer = clustererRef.current;

    if (!ready || !kakao?.maps || !map) {
      return;
    }

    clusterer?.clear();

    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });

    markersRef.current = [];
    infoWindowRef.current?.close();
    infoWindowRef.current = null;

    const newMarkers: KakaoMarkerInstance[] = [];
    const bounds = new kakao.maps.LatLngBounds();

    filteredPlaces.forEach((place) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      const position = new kakao.maps.LatLng(
        latitude,
        longitude
      );

      const marker = new kakao.maps.Marker({
        position,
      });

      const content = document.createElement("div");
      content.className = "kp-map-info-card";

      const category = document.createElement("small");
      category.textContent = place.category;

      const title = document.createElement("strong");
      title.textContent = place.name;

      const location = document.createElement("span");
      location.textContent = [
        place.region,
        place.city,
      ]
        .filter(Boolean)
        .join(" ");

      const address = document.createElement("p");
      address.textContent =
        place.address ?? "주소 정보가 없습니다.";

      content.append(
        category,
        title,
        location,
        address
      );

      kakao.maps.event.addListener(
        marker,
        "click",
        () => {
          void trackPlaceActivity(place, "detail");
          infoWindowRef.current?.close();

          const infoWindow =
            new kakao.maps.InfoWindow({
              content,
              removable: true,
            });

          infoWindow.open(map, marker);
          infoWindowRef.current = infoWindow;
        }
      );

      newMarkers.push(marker);
      bounds.extend(position);
    });

    if (clusterer) {
      clusterer.addMarkers(newMarkers);
    } else {
      newMarkers.forEach((marker) => {
        marker.setMap(map);
      });
    }

    if (newMarkers.length > 0) {
      map.setBounds(bounds);

      if (newMarkers.length === 1) {
        map.setLevel(5);
      }
    }

    markersRef.current = newMarkers;
  }, [filteredPlaces, ready]);

  const moveMapToRegion = (
    regionName: RegionName
  ) => {
    const kakao =
      (window as KakaoWindow).kakao;
    const map = mapRef.current;

    if (!kakao?.maps || !map) {
      return;
    }

    const region = regions[regionName];
    const position = new kakao.maps.LatLng(
      region.latitude,
      region.longitude
    );

    map.panTo(position);
    map.setLevel(region.level);
  };

  const selectRegion = (regionName: RegionName) => {
    setSelectedRegion(regionName);
    setSelectedSubregion("전체");
    setPage(1);
    moveMapToRegion(regionName);
  };

  const selectSubregion = (subregion: string) => {
    setSelectedSubregion(subregion);
    setPage(1);

    if (subregion === "전체") {
      moveMapToRegion(selectedRegion);
      return;
    }

    const matchingPlace = places.find((place) =>
      placeMatchesSelection(
        place,
        selectedRegion,
        subregion
      )
    );

    const kakao =
      (window as KakaoWindow).kakao;
    const map = mapRef.current;

    if (!matchingPlace || !kakao?.maps || !map) {
      return;
    }

    const latitude = Number(matchingPlace.latitude);
    const longitude = Number(matchingPlace.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.panTo(
      new kakao.maps.LatLng(latitude, longitude)
    );
    map.setLevel(6);
  };

  return (
    <section
      className="kp-region-section"
      id="regions"
    >
      <div className="kp-container kp-region-explorer-grid">
        <div className="kp-region-content">
          <p className="kp-overline">
            REGION GUIDE
          </p>

          <h2>
            지역별 인기 장소
            <br />
            빠르게 찾아보세요.
          </h2>

          <p>
            시·도와 시·군·구를 선택한 뒤 음식, 카페,
            축제와 관광지의 세부 종류를 찾아보세요.
          </p>

          <div className="kp-region-buttons">
            {(
              Object.keys(regions) as RegionName[]
            ).map((regionName) => (
              <button
                type="button"
                key={regionName}
                className={
                  selectedRegion === regionName
                    ? "is-active"
                    : ""
                }
                aria-pressed={
                  selectedRegion === regionName
                }
                onClick={() =>
                  selectRegion(regionName)
                }
              >
                {regionName}
              </button>
            ))}
          </div>

          {selectedRegion !== "전국" && (
            <div className="kp-subregion-filter">
              <small>DETAIL REGION</small>

              <div className="kp-subregion-buttons">
                {[
                  "전체",
                  ...availableSubregions,
                ].map((subregion) => (
                  <button
                    type="button"
                    key={subregion}
                    className={
                      selectedSubregion === subregion
                        ? "is-active"
                        : ""
                    }
                    aria-pressed={
                      selectedSubregion === subregion
                    }
                    onClick={() =>
                      selectSubregion(subregion)
                    }
                  >
                    {subregion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="kp-place-filter">
            <small>PLACE CATEGORY</small>

            <div className="kp-category-buttons">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    selectedCategory === category
                      ? "is-active"
                      : ""
                  }
                  aria-pressed={
                    selectedCategory === category
                  }
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedDetail("전체");
                    setPage(1);
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {selectedCategory !== "전체" && (
            <div className="kp-detail-filter">
              <div className="kp-detail-filter-heading">
                <small>DETAIL TYPE</small>
                <strong>{selectedCategory} 종류</strong>
              </div>

              <div className="kp-detail-buttons">
                {availableDetails.map((detail) => (
                  <button
                    type="button"
                    key={detail}
                    className={
                      selectedDetail === detail
                        ? "is-active"
                        : ""
                    }
                    aria-pressed={selectedDetail === detail}
                    onClick={() => {
                      setSelectedDetail(detail);
                      setPage(1);
                    }}
                  >
                    {detail}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="kp-place-summary">
            {placesLoading && (
              <span>
                추천 장소를 불러오는 중입니다.
              </span>
            )}

            {!placesLoading && placesError && (
              <span className="is-error">
                장소 조회 오류: {placesError}
              </span>
            )}

            {!placesLoading && !placesError && (
              <strong>
                {selectedRegion}
                {selectedSubregion !== "전체"
                  ? ` · ${selectedSubregion}`
                  : ""}
                {" · "}
                {selectedCategory}
                {selectedDetail !== "전체"
                  ? ` · ${selectedDetail}`
                  : ""}{" "}
                추천 장소{" "}
                {totalCount.toLocaleString("ko-KR")}곳
              </strong>
            )}
          </div>

          {!placesLoading && !placesError && totalPages > 1 && (
            <nav className="kp-place-pagination" aria-label="추천 장소 페이지">
              <button
                type="button"
                className="kp-pagination-button kp-pagination-button--prev"
                aria-label="이전 페이지"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <span className="kp-pagination-arrow" aria-hidden="true">‹</span>
                <span>이전</span>
              </button>

              <span
                key={page}
                className="kp-pagination-status"
                aria-live="polite"
                aria-label={`${page} / ${totalPages} 페이지`}
              >
                <strong>{page.toLocaleString("ko-KR")}</strong>
                <span aria-hidden="true">/</span>
                <span>{totalPages.toLocaleString("ko-KR")}</span>
              </span>

              <button
                type="button"
                className="kp-pagination-button kp-pagination-button--next"
                aria-label="다음 페이지"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <span>다음</span>
                <span className="kp-pagination-arrow" aria-hidden="true">›</span>
              </button>
            </nav>
          )}
        </div>

        <article className="kp-region-map-shell">
          <div
            ref={containerRef}
            className="kp-region-map"
            aria-label={`${selectedRegion} 카카오 지도`}
          />

          <div className="kp-region-map-label">
            <small>SELECTED REGION</small>
            <strong>
              {selectedSubregion === "전체"
                ? selectedRegion
                : selectedSubregion}
            </strong>
          </div>

          {!ready && !mapError && (
            <div className="kp-region-map-state">
              카카오 지도를 불러오는 중입니다.
            </div>
          )}

          {mapError && (
            <div className="kp-region-map-state kp-region-map-error">
              {mapError}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
