"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";
import { springApiUrl } from "@/utils/spring-api";
import {
  kakaoBookingSearchUrl,
  naverBookingSearchUrl,
} from "@/utils/external-booking";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";

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
  placeUrl?: string | null;
  bookingAvailable?: boolean;
  bookingKind?: string | null;
  bookingInfo?: string | null;
}

interface SubregionOption {
  code: string;
  name: string;
}

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
  open(map: KakaoMapInstance, marker: KakaoMarkerInstance): void;
  close(): void;
}

interface KakaoMapsApi {
  load(callback: () => void): void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number }
  ) => KakaoMapInstance;
  Marker: new (options: { position: KakaoLatLng }) => KakaoMarkerInstance;
  InfoWindow: new (options: {
    content: HTMLElement;
    removable?: boolean;
  }) => KakaoInfoWindowInstance;
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
  kakao?: { maps: KakaoMapsApi };
};

const regionCenters = {
  전국: { latitude: 36.35, longitude: 127.85, level: 13 },
  서울: { latitude: 37.5665, longitude: 126.978, level: 8 },
  부산: { latitude: 35.1796, longitude: 129.0756, level: 8 },
  대구: { latitude: 35.8714, longitude: 128.6014, level: 8 },
  인천: { latitude: 37.4563, longitude: 126.7052, level: 8 },
  광주: { latitude: 35.1595, longitude: 126.8526, level: 8 },
  대전: { latitude: 36.3504, longitude: 127.3845, level: 8 },
  울산: { latitude: 35.5384, longitude: 129.3114, level: 8 },
  세종: { latitude: 36.4801, longitude: 127.289, level: 8 },
  경기: { latitude: 37.4138, longitude: 127.5183, level: 11 },
  강원: { latitude: 37.8228, longitude: 128.1555, level: 11 },
  충북: { latitude: 36.6357, longitude: 127.4917, level: 10 },
  충남: { latitude: 36.6588, longitude: 126.6728, level: 10 },
  전북: { latitude: 35.8203, longitude: 127.1088, level: 10 },
  전남: { latitude: 34.8161, longitude: 126.463, level: 10 },
  경북: { latitude: 36.576, longitude: 128.5056, level: 10 },
  경남: { latitude: 35.2383, longitude: 128.6924, level: 10 },
  제주: { latitude: 33.4996, longitude: 126.5312, level: 10 },
} as const;

type RegionName = keyof typeof regionCenters;

const categoryOptions: Array<{
  value: CategoryValue;
  label: string;
}> = [
  { value: "전체", label: "전체" },
  { value: "음식", label: "음식" },
  { value: "카페", label: "카페" },
  { value: "축제", label: "축제" },
  { value: "관광지", label: "관광지" },
];

const categoryDetails: Record<Exclude<CategoryValue, "전체">, string[]> = {
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

const detailLabels: Record<Exclude<CategoryValue, "전체">, string> = {
  음식: "음식 종류",
  카페: "카페 유형",
  축제: "축제·행사 유형",
  관광지: "관광지 유형",
};

function displayCategory(category: string) {
  return category === "맛집" ? "음식" : category;
}

interface CategoryExplorePageProps {
  initialCategory: CategoryValue;
}

export default function CategoryExplorePage({
  initialCategory,
}: CategoryExplorePageProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const infoWindowRef = useRef<KakaoInfoWindowInstance | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryValue>(initialCategory);
  const [selectedDetail, setSelectedDetail] = useState("전체");
  const [selectedRegion, setSelectedRegion] =
    useState<RegionName>("전국");
  const [selectedSubregion, setSelectedSubregion] = useState("전체");
  const [subregions, setSubregions] = useState<SubregionOption[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [bookingOnly, setBookingOnly] = useState(false);
  const [bookingScannedCount, setBookingScannedCount] = useState(0);
  const [mapError, setMapError] = useState(() =>
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
      ? ""
      : "카카오 지도 API 키가 설정되지 않았습니다."
  );

  const selectedCategoryLabel = useMemo(
    () =>
      categoryOptions.find(
        (option) => option.value === selectedCategory
      )?.label ?? selectedCategory,
    [selectedCategory]
  );

  const detailOptions =
    selectedCategory === "전체" ? [] : categoryDetails[selectedCategory];
  const detailLabel =
    selectedCategory === "전체" ? "" : detailLabels[selectedCategory];

  useEffect(() => {
    let cancelled = false;

    async function loadSubregions() {
      if (selectedRegion === "전국") {
        setSubregions([]);
        setSelectedSubregion("전체");
        return;
      }

      try {
        const response = await fetch(
          `${springApiUrl}/api/public/tour/places?mode=subregions&region=` +
            encodeURIComponent(selectedRegion)
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error ?? "세부 지역을 불러오지 못했습니다."
          );
        }

        if (!cancelled) {
          setSubregions(payload.subregions ?? []);
        }
      } catch {
        if (!cancelled) setSubregions([]);
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
      setLoading(true);
      setError("");

      try {
        const sigunguCode =
          selectedSubregion === "전체"
            ? ""
            : subregions.find(
                (option) => option.name === selectedSubregion
              )?.code ?? "";

        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
          region: selectedRegion,
          category: selectedCategory,
        });

        if (sigunguCode) params.set("sigunguCode", sigunguCode);
        if (selectedDetail !== "전체") {
          params.set("detailType", selectedDetail);
        }
        if (bookingOnly) params.set("bookingOnly", "true");

        const response = await fetch(
          `${springApiUrl}/api/public/tour/places?` + params.toString()
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error ?? "추천 장소를 불러오지 못했습니다."
          );
        }

        if (!cancelled) {
          setPlaces(payload.places ?? []);
          setTotalCount(Number(payload.pagination?.totalCount ?? 0));
          setTotalPages(
            Math.max(1, Number(payload.pagination?.totalPages ?? 1))
          );
          setBookingScannedCount(
            Number(payload.bookingFilter?.scannedCount ?? 0)
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setPlaces([]);
          setTotalCount(0);
          setTotalPages(1);
          setBookingScannedCount(0);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "추천 장소를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    selectedCategory,
    selectedDetail,
    selectedRegion,
    selectedSubregion,
    subregions,
    bookingOnly,
  ]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

    if (!apiKey) {
      return;
    }

    const initializeMap = () => {
      const kakao = (window as KakaoWindow).kakao;
      if (!kakao?.maps) {
        setMapError("카카오 지도 SDK를 불러오지 못했습니다.");
        return;
      }

      kakao.maps.load(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const initial = regionCenters.전국;
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(
            initial.latitude,
            initial.longitude
          ),
          level: initial.level,
        });

        map.addControl(
          new kakao.maps.MapTypeControl(),
          kakao.maps.ControlPosition.TOPRIGHT
        );
        map.addControl(
          new kakao.maps.ZoomControl(),
          kakao.maps.ControlPosition.RIGHT
        );

        mapRef.current = map;
        setMapReady(true);
      });
    };

    if ((window as KakaoWindow).kakao?.maps) {
      initializeMap();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-sdk="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", initializeMap, {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMapSdk = "true";
    script.async = true;
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
      apiKey +
      "&autoload=false&libraries=services";
    script.addEventListener("load", initializeMap, { once: true });
    script.addEventListener(
      "error",
      () => setMapError("카카오 지도 연결에 실패했습니다."),
      { once: true }
    );
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const kakao = (window as KakaoWindow).kakao;
    const map = mapRef.current;

    if (!mapReady || !kakao?.maps || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    infoWindowRef.current = null;

    const bounds = new kakao.maps.LatLngBounds();
    const newMarkers: KakaoMarkerInstance[] = [];

    places.forEach((place) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const position = new kakao.maps.LatLng(latitude, longitude);
      const marker = new kakao.maps.Marker({ position });
      marker.setMap(map);

      const content = document.createElement("div");
      content.className = "kp-explore-info-window";

      if (place.imageUrl) {
        const image = document.createElement("img");
        image.className = "kp-explore-info-window-image";
        image.src = place.imageUrl;
        image.alt = place.name + " 대표 사진";
        image.loading = "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => image.remove(), { once: true });
        content.append(image);
      }

      const category = document.createElement("small");
      category.textContent = displayCategory(place.category);
      const title = document.createElement("strong");
      title.textContent = place.name;
      const address = document.createElement("span");
      address.textContent = place.address ?? "주소 정보 없음";
      content.append(category, title, address);

      kakao.maps.event.addListener(marker, "click", () => {
        infoWindowRef.current?.close();
        const infoWindow = new kakao.maps.InfoWindow({
          content,
          removable: true,
        });
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
      });

      bounds.extend(position);
      newMarkers.push(marker);
    });

    if (newMarkers.length > 0) {
      map.setBounds(bounds);
      if (newMarkers.length === 1) map.setLevel(4);
    }

    markersRef.current = newMarkers;
  }, [mapReady, places]);

  const moveToRegion = (regionName: RegionName) => {
    const kakao = (window as KakaoWindow).kakao;
    const map = mapRef.current;
    if (!kakao?.maps || !map) return;

    const region = regionCenters[regionName];
    map.panTo(
      new kakao.maps.LatLng(region.latitude, region.longitude)
    );
    map.setLevel(region.level);
  };

  const selectRegion = (regionName: RegionName) => {
    setSelectedRegion(regionName);
    setSelectedSubregion("전체");
    setPage(1);
    moveToRegion(regionName);
  };

  const focusPlace = (place: Place) => {
    void trackPlaceActivity(place, "detail");

    const kakao = (window as KakaoWindow).kakao;
    const map = mapRef.current;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);

    if (
      !kakao?.maps ||
      !map ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.panTo(new kakao.maps.LatLng(latitude, longitude));
    map.setLevel(4);

    if (window.innerWidth <= 900) {
      mapContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <main className="kp-explore-page">
      <header className="kp-explore-header">
        <a href="/" className="kp-explore-brand">
          <span>K</span>
          <strong>코리아픽</strong>
        </a>

        <div>
          <small>PLACE EXPLORER</small>
          <strong>
            {bookingOnly ? "예약 가능 장소" : selectedCategoryLabel + " 전체 결과"}
          </strong>
        </div>

        <nav className="kp-explore-header-actions" aria-label="탐색 화면 메뉴">
          <a className="kp-explore-reservations-link" href="/reservations">
            함께 예약
          </a>
          <a href="/" className="kp-explore-home-link">
            홈으로
          </a>
        </nav>
      </header>

      <div className="kp-explore-workspace">
        <aside className="kp-explore-panel">
          <section className="kp-explore-filter-section">
            <p className="kp-explore-eyebrow">PLACE CATEGORY</p>
            <h1>{selectedCategoryLabel} 장소 찾기</h1>
            <p>
              카테고리와 지역을 선택하면 장소 목록과 지도가
              함께 변경됩니다.
            </p>

            <div className="kp-explore-bookable-filter" aria-label="예약 가능 여부">
              <button
                type="button"
                className={!bookingOnly ? "is-active" : ""}
                aria-pressed={!bookingOnly}
                onClick={() => {
                  setBookingOnly(false);
                  setPage(1);
                }}
              >
                전체 장소
              </button>
              <button
                type="button"
                className={bookingOnly ? "is-active" : ""}
                aria-pressed={bookingOnly}
                onClick={() => {
                  setBookingOnly(true);
                  setPage(1);
                }}
              >
                예약 가능한 곳
              </button>
              <small>
                한국관광공사 데이터에 예약 안내·예매처가 등록된 장소만 표시
              </small>
            </div>

            <div className="kp-explore-category-buttons">
              {categoryOptions
                .filter((option) => option.value === initialCategory)
                .map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    selectedCategory === option.value
                      ? "is-active"
                      : ""
                  }
                  aria-pressed={selectedCategory === option.value}
                  onClick={() => {
                    setSelectedCategory(option.value);
                    setSelectedDetail("전체");
                    setPage(1);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {detailOptions.length > 0 && (
              <div className="kp-explore-detail-filter">
                <div className="kp-explore-detail-heading">
                  <strong>DETAIL TYPE</strong>
                  <span>{detailLabel}</span>
                </div>
                <div className="kp-explore-detail-buttons">
                  {detailOptions.map((detail) => (
                    <button
                      key={detail}
                      type="button"
                      className={selectedDetail === detail ? "is-active" : ""}
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

            <div className="kp-explore-region-selects">
              <label>
                <span>시·도</span>
                <select
                  value={selectedRegion}
                  onChange={(event) =>
                    selectRegion(event.target.value as RegionName)
                  }
                >
                  {(Object.keys(regionCenters) as RegionName[]).map(
                    (regionName) => (
                      <option key={regionName} value={regionName}>
                        {regionName}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>시·군·구</span>
                <select
                  value={selectedSubregion}
                  disabled={selectedRegion === "전국"}
                  onChange={(event) => {
                    setSelectedSubregion(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="전체">전체</option>
                  {subregions.map((subregion) => (
                    <option key={subregion.code} value={subregion.name}>
                      {subregion.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <div className="kp-explore-summary" aria-live="polite">
            {loading && <span>추천 장소를 불러오는 중입니다.</span>}
            {!loading && error && <span>장소 조회 오류: {error}</span>}
            {!loading && !error && (
              <strong>
                {selectedRegion}
                {selectedSubregion !== "전체"
                  ? " · " + selectedSubregion
                  : ""}
                {" · "}
                {selectedCategoryLabel}
                {selectedDetail !== "전체" ? " · " + selectedDetail : ""}
                {bookingOnly ? " 예약 안내 확인 " : " 추천 장소 "}
                {(bookingOnly ? places.length : totalCount).toLocaleString("ko-KR")}곳
                {bookingOnly && bookingScannedCount > 0
                  ? ` · 원본 장소 ${bookingScannedCount.toLocaleString("ko-KR")}곳 확인`
                  : ""}
              </strong>
            )}
          </div>

          {!loading && !error && places.length === 0 && (
            <div className="kp-explore-empty">
              {bookingOnly
                ? "선택한 조건에서 예약 안내가 등록된 장소를 찾지 못했습니다. 지역이나 음식 종류를 변경해 주세요."
                : "선택한 조건의 장소가 없습니다."}
            </div>
          )}

          {!loading && !error && places.length > 0 && (
            <div className="kp-explore-card-grid">
              {places.map((place) => (
                <article className="kp-explore-place-card" key={place.id}>
                  <button
                    type="button"
                    onClick={() => focusPlace(place)}
                    aria-label={place.name + " 지도에서 보기"}
                  >
                    <div className="kp-explore-card-image">
                      <span aria-hidden="true">
                        {displayCategory(place.category).slice(0, 1)}
                      </span>
                      {place.imageUrl && (
                        <img
                          src={place.imageUrl}
                          alt={place.name + " 대표 사진"}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <small>{displayCategory(place.category)}</small>
                      {place.bookingAvailable && (
                        <b className="kp-explore-bookable-badge">
                          예약 안내 확인
                        </b>
                      )}
                    </div>

                    <div className="kp-explore-card-copy">
                      <span>
                        {[place.region, place.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <h2>{place.name}</h2>
                      <p>{place.address ?? "주소 정보가 없습니다."}</p>
                      <strong>지도에서 보기 ↗</strong>
                    </div>
                  </button>
                  <div className="kp-explore-booking-panel">
                    <div className="kp-explore-booking-heading">
                      <strong>
                        {place.bookingAvailable ? place.bookingKind : "외부 예약"}
                      </strong>
                      <span>
                        {place.bookingAvailable
                          ? "공식 관광 데이터 기준"
                          : "예약 가능 여부는 외부 서비스에서 확인"}
                      </span>
                    </div>
                    {place.bookingAvailable && place.bookingInfo && (
                      <p className="kp-explore-booking-info">
                        {place.bookingInfo}
                      </p>
                    )}
                    <div className="kp-explore-booking-links">
                      <a
                        className="is-naver"
                        href={naverBookingSearchUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${place.name} 네이버 예약 확인`}
                      >
                        네이버 예약 확인 ↗
                      </a>
                      <a
                        className="is-kakao"
                        href={kakaoBookingSearchUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${place.name} 카카오 예약 확인`}
                      >
                        카카오 예약 확인 ↗
                      </a>
                    </div>
                    <a
                      className="kp-explore-reservation-link"
                      href={`/reservations?${new URLSearchParams({
                        placeId: String(place.id),
                        placeName: place.name,
                        address: place.address ?? "",
                        category: displayCategory(place.category),
                      }).toString()}`}
                    >
                      함께 예약 후보로 담기 →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <nav
              className="kp-explore-pagination"
              aria-label="장소 결과 페이지"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                이전
              </button>
              <span>
                <strong>{page.toLocaleString("ko-KR")}</strong>
                {" / "}
                {totalPages.toLocaleString("ko-KR")}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                다음
              </button>
            </nav>
          )}

          <footer className="kp-explore-source">
            <strong>데이터 출처</strong>
            <span>장소 정보·이미지: 한국관광공사 TourAPI</span>
            <span>예약 분류: TourAPI 예약 안내·예매처 등록 여부</span>
            <span>지도: Kakao Maps</span>
            <small>
              다른 서비스의 별점·리뷰·사진은 복사하지 않습니다.
            </small>
          </footer>
        </aside>

        <section className="kp-explore-map-shell" aria-label="장소 지도">
          <div ref={mapContainerRef} className="kp-explore-map" />

          <div className="kp-explore-map-label">
            <small>SELECTED AREA</small>
            <strong>
              {selectedSubregion === "전체"
                ? selectedRegion
                : selectedSubregion}
            </strong>
            <span>{selectedCategoryLabel}</span>
          </div>

          {!mapReady && !mapError && (
            <div className="kp-explore-map-state">
              카카오 지도를 불러오는 중입니다.
            </div>
          )}
          {mapError && (
            <div className="kp-explore-map-state">{mapError}</div>
          )}
        </section>
      </div>
    </main>
  );
}
