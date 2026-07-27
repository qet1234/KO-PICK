"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";
import { springApiUrl } from "@/utils/spring-api";
import NaverBookingButton from "@/components/NaverBookingButton";
import {
  loadNaverMaps,
  naverMapSearchUrl,
  naverMapsApi,
  type NaverInfoWindowInstance,
  type NaverMapInstance,
  type NaverMarkerInstance,
} from "@/utils/naver-maps";

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
}

interface SubregionOption {
  code: string;
  name: string;
}

const regionCenters = {
  전국: { latitude: 36.35, longitude: 127.85, zoom: 7 },
  서울: { latitude: 37.5665, longitude: 126.978, zoom: 11 },
  부산: { latitude: 35.1796, longitude: 129.0756, zoom: 11 },
  대구: { latitude: 35.8714, longitude: 128.6014, zoom: 11 },
  인천: { latitude: 37.4563, longitude: 126.7052, zoom: 11 },
  광주: { latitude: 35.1595, longitude: 126.8526, zoom: 11 },
  대전: { latitude: 36.3504, longitude: 127.3845, zoom: 11 },
  울산: { latitude: 35.5384, longitude: 129.3114, zoom: 11 },
  세종: { latitude: 36.4801, longitude: 127.289, zoom: 11 },
  경기: { latitude: 37.4138, longitude: 127.5183, zoom: 9 },
  강원: { latitude: 37.8228, longitude: 128.1555, zoom: 9 },
  충북: { latitude: 36.6357, longitude: 127.4917, zoom: 9 },
  충남: { latitude: 36.6588, longitude: 126.6728, zoom: 9 },
  전북: { latitude: 35.8203, longitude: 127.1088, zoom: 9 },
  전남: { latitude: 34.8161, longitude: 126.463, zoom: 9 },
  경북: { latitude: 36.576, longitude: 128.5056, zoom: 9 },
  경남: { latitude: 35.2383, longitude: 128.6924, zoom: 9 },
  제주: { latitude: 33.4996, longitude: 126.5312, zoom: 10 },
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

const franchiseCafeBrands = [
  "스타벅스",
  "투썸플레이스",
  "이디야",
  "메가mgc커피",
  "메가커피",
  "컴포즈커피",
  "빽다방",
  "할리스",
  "엔제리너스",
  "파스쿠찌",
  "폴바셋",
  "탐앤탐스",
  "커피빈",
  "카페베네",
  "더벤티",
  "매머드커피",
  "매머드익스프레스",
  "텐퍼센트커피",
  "하삼동커피",
  "감성커피",
  "커피베이",
  "셀렉토커피",
  "벌크커피",
  "청자다방",
  "카페봄봄",
  "달콤커피",
  "커피에반하다",
  "드롭탑",
  "커피스미스",
  "토프레소",
  "그라찌에",
  "커피니",
  "읍천리382",
  "디저트39",
  "공차",
  "아마스빈",
  "요거프레소",
  "설빙",
  "파리바게뜨",
  "뚜레쥬르",
  "카페게이트",
  "더리터",
  "커피마마",
  "백억커피",
  "카페인중독",
  "테라로사",
  "보사노바",
  "커피명가",
  "아티제",
  "빌리엔젤",
  "카페노티드",
  "노티드",
  "카페레이어드",
  "만랩커피",
  "커피홀",
  "커피나무",
  "커피사피엔스",
  "우지커피",
  "블루샥",
  "바나프레소",
  "starbucks",
  "twosomeplace",
  "ediya",
  "megacoffee",
  "composecoffee",
  "paikscoffee",
] as const;

function normalizeCafeName(value: string) {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function isFranchiseCafe(place: Place) {
  if (!displayCategory(place.category).startsWith("카페")) return false;

  const normalizedName = normalizeCafeName(place.name);
  const hasKnownBrand = franchiseCafeBrands.some((brand) =>
    normalizedName.includes(normalizeCafeName(brand))
  );
  const hasBranchLabel =
    /(?:본점|직영점|가맹점|[0-9A-Za-z가-힣]{2,}점)$/.test(normalizedName);

  return hasKnownBrand || hasBranchLabel;
}

function CategoryFallbackIcon({ category }: { category: string }) {
  const normalizedCategory = displayCategory(category);

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {normalizedCategory === "음식" && (
        <>
          <path d="M8 7v8c0 3.3 2.7 6 6 6s6-2.7 6-6V7M14 7v34M29 7v34" />
          <path d="M29 7c7 3.8 9.5 12.5 0 19" />
        </>
      )}
      {normalizedCategory === "카페" && (
        <>
          <path d="M9 18h26v8c0 6.1-4.9 11-11 11h-4c-6.1 0-11-4.9-11-11v-8Z" />
          <path d="M35 21h3.5a5.5 5.5 0 0 1 0 11H35M8 41h31M16 7c-2 2.2-2 4.5 0 7M24 7c-2 2.2-2 4.5 0 7" />
        </>
      )}
      {normalizedCategory === "축제" && (
        <>
          <path d="M24 6v9M24 33v9M6 24h9M33 24h9M11.3 11.3l6.4 6.4M30.3 30.3l6.4 6.4M36.7 11.3l-6.4 6.4M17.7 30.3l-6.4 6.4" />
          <circle cx="24" cy="24" r="4.5" />
        </>
      )}
      {normalizedCategory !== "음식" &&
        normalizedCategory !== "카페" &&
        normalizedCategory !== "축제" && (
          <>
            <circle cx="35" cy="12" r="4" />
            <path d="M6 38 18 21l8 10 5-6 11 13H6ZM18 21l4-7 7 10" />
          </>
        )}
    </svg>
  );
}

interface CategoryExplorePageProps {
  initialCategory: CategoryValue;
  initialDetail?: string;
  journeyLabel?: string;
  resultLabel?: string;
}

export default function CategoryExplorePage({
  initialCategory,
  initialDetail = "전체",
  journeyLabel,
  resultLabel,
}: CategoryExplorePageProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<NaverMarkerInstance[]>([]);
  const infoWindowRef = useRef<NaverInfoWindowInstance | null>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryValue>(initialCategory);
  const [selectedDetail, setSelectedDetail] = useState(() => {
    if (initialCategory === "전체" || initialCategory === "음식") return "전체";
    return categoryDetails[initialCategory].includes(initialDetail)
      ? initialDetail
      : "전체";
  });
  const [selectedFoodDetails, setSelectedFoodDetails] = useState<string[]>(() =>
    initialCategory === "음식" &&
    initialDetail !== "전체" &&
    categoryDetails.음식.includes(initialDetail)
      ? [initialDetail]
      : []
  );
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
  const [mapError, setMapError] = useState(() =>
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
      ? ""
      : "네이버 지도 Client ID가 설정되지 않았습니다."
  );

  const selectedCategoryLabel = useMemo(
    () =>
      categoryOptions.find(
        (option) => option.value === selectedCategory
      )?.label ?? selectedCategory,
    [selectedCategory]
  );

  const resultCategoryLabel =
    resultLabel && resultLabel !== "전체"
      ? resultLabel
      : journeyLabel
        ? `${journeyLabel} 전체`
        : selectedCategoryLabel;

  const detailOptions =
    selectedCategory === "전체" ? [] : categoryDetails[selectedCategory];
  const detailLabel =
    selectedCategory === "전체" ? "" : detailLabels[selectedCategory];
  const selectedDetailSummary =
    selectedCategory === "음식"
      ? selectedFoodDetails.join(" · ")
      : selectedDetail === "전체"
        ? ""
        : selectedDetail;

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
        if (selectedCategory === "음식") {
          selectedFoodDetails.forEach((detail) => {
            params.append("detailType", detail);
          });
        } else if (selectedDetail !== "전체") {
          params.set("detailType", selectedDetail);
        }

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
          const receivedPlaces = (payload.places ?? []) as Place[];
          const visiblePlaces = receivedPlaces.filter(
            (place) => !isFranchiseCafe(place)
          );
          const excludedCount = receivedPlaces.length - visiblePlaces.length;

          setPlaces(visiblePlaces);
          setTotalCount(
            Math.max(
              0,
              Number(payload.pagination?.totalCount ?? visiblePlaces.length) -
                excludedCount
            )
          );
          setTotalPages(
            Math.max(1, Number(payload.pagination?.totalPages ?? 1))
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setPlaces([]);
          setTotalCount(0);
          setTotalPages(1);
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
    selectedFoodDetails,
    selectedRegion,
    selectedSubregion,
    subregions,
  ]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;
    loadNaverMaps(clientId)
      .then((naverMaps) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;

        const initial = regionCenters.전국;
        mapRef.current = new naverMaps.Map(mapContainerRef.current, {
          center: new naverMaps.LatLng(
            initial.latitude,
            initial.longitude
          ),
          zoom: initial.zoom,
          mapTypeControl: true,
          mapDataControl: false,
          scaleControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: naverMaps.Position.TOP_RIGHT,
          },
        });
        setMapReady(true);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setMapError(
            loadError instanceof Error
              ? loadError.message
              : "네이버 지도 연결에 실패했습니다."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const naverMaps = naverMapsApi();
    const map = mapRef.current;

    if (!mapReady || !naverMaps || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    infoWindowRef.current = null;

    const bounds = new naverMaps.LatLngBounds();
    const newMarkers: NaverMarkerInstance[] = [];

    places.forEach((place) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const position = new naverMaps.LatLng(latitude, longitude);
      const marker = new naverMaps.Marker({
        position,
        map,
        title: place.name,
      });

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
      const mapLink = document.createElement("a");
      mapLink.href = naverMapSearchUrl(
        place.name,
        place.address,
        place.latitude,
        place.longitude
      );
      mapLink.target = "_blank";
      mapLink.rel = "noopener noreferrer";
      mapLink.textContent = "네이버 지도에서 보기 ↗";
      content.append(category, title, address, mapLink);

      naverMaps.Event.addListener(marker, "click", () => {
        infoWindowRef.current?.close();
        const infoWindow = new naverMaps.InfoWindow({
          content,
          borderWidth: 0,
          backgroundColor: "transparent",
          disableAnchor: true,
          pixelOffset: new naverMaps.Point(0, -10),
        });
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
      });

      bounds.extend(position);
      newMarkers.push(marker);
    });

    if (newMarkers.length > 0) {
      map.fitBounds(bounds, {
        top: 80,
        right: 60,
        bottom: 80,
        left: 60,
      });
      if (newMarkers.length === 1) map.setZoom(15);
    }

    markersRef.current = newMarkers;
  }, [mapReady, places]);

  const moveToRegion = (regionName: RegionName) => {
    const naverMaps = naverMapsApi();
    const map = mapRef.current;
    if (!naverMaps || !map) return;

    const region = regionCenters[regionName];
    map.panTo(new naverMaps.LatLng(region.latitude, region.longitude));
    map.setZoom(region.zoom);
  };

  const selectRegion = (regionName: RegionName) => {
    setSelectedRegion(regionName);
    setSelectedSubregion("전체");
    setPage(1);
    moveToRegion(regionName);
  };

  const focusPlace = (place: Place) => {
    void trackPlaceActivity(place, "detail");

    const naverMaps = naverMapsApi();
    const map = mapRef.current;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);

    if (
      !naverMaps ||
      !map ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    map.panTo(new naverMaps.LatLng(latitude, longitude));
    map.setZoom(15);

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
          <strong>{journeyLabel ? `${journeyLabel} 맞춤 지도` : `${selectedCategoryLabel} 전체 결과`}</strong>
        </div>

        <a href="/" className="kp-explore-home-link">
          홈으로
        </a>
      </header>

      <div className="kp-explore-workspace">
        <aside className="kp-explore-panel">
          <section className="kp-explore-filter-section">
            <p className="kp-explore-eyebrow">{journeyLabel ? "RELATIONSHIP PLACE MAP" : "PLACE CATEGORY"}</p>
            <h1>{journeyLabel ? `${journeyLabel} 장소 찾기` : `${selectedCategoryLabel} 장소 찾기`}</h1>
            <p>
              {journeyLabel
                ? `${journeyLabel} 카테고리와 지역을 선택하면 추천 장소 목록과 지도가 함께 변경됩니다.`
                : "카테고리와 지역을 선택하면 장소 목록과 지도가 함께 변경됩니다."}
            </p>

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
                    setSelectedFoodDetails([]);
                    setPage(1);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {detailOptions.length > 0 && (
              <div
                className={`kp-explore-detail-filter${
                  selectedCategory === "음식" ? " is-food-filter" : ""
                }`}
              >
                <div className="kp-explore-detail-heading">
                  <div>
                    <strong>
                      {selectedCategory === "음식" ? "FOOD TYPE" : "DETAIL TYPE"}
                    </strong>
                    <span>{detailLabel}</span>
                  </div>
                  {selectedCategory === "음식" && (
                    <small aria-live="polite">
                      {selectedFoodDetails.length > 0
                        ? `${selectedFoodDetails.length}개 선택`
                        : "전체 선택"}
                    </small>
                  )}
                </div>
                {selectedCategory === "음식" ? (
                  <>
                    <p className="kp-explore-food-filter-help">
                      원하는 음식 종류를 여러 개 체크할 수 있습니다.
                    </p>
                    <div
                      className="kp-explore-food-checks"
                      role="group"
                      aria-label="음식 종류 다중 선택"
                    >
                      {detailOptions.map((detail) => {
                        const isAll = detail === "전체";
                        const isChecked = isAll
                          ? selectedFoodDetails.length === 0
                          : selectedFoodDetails.includes(detail);

                        return (
                          <label
                            className={`kp-explore-food-check${
                              isChecked ? " is-checked" : ""
                            }`}
                            key={detail}
                          >
                            <input
                              type="checkbox"
                              name="foodType"
                              value={detail}
                              checked={isChecked}
                              onChange={() => {
                                if (isAll) {
                                  setSelectedFoodDetails([]);
                                } else {
                                  setSelectedFoodDetails((current) =>
                                    current.includes(detail)
                                      ? current.filter((value) => value !== detail)
                                      : [...current, detail]
                                  );
                                }
                                setPage(1);
                              }}
                            />
                            <span aria-hidden="true">✓</span>
                            <b>{detail}</b>
                          </label>
                        );
                      })}
                    </div>
                  </>
                ) : (
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
                )}
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
                {resultCategoryLabel}
                {!journeyLabel && selectedDetailSummary
                  ? " · " + selectedDetailSummary
                  : ""}
                {" 추천 장소 "}
                {totalCount.toLocaleString("ko-KR")}곳
              </strong>
            )}
          </div>

          {!loading && !error && places.length === 0 && (
            <div className="kp-explore-empty">
              선택한 조건의 장소가 없습니다.
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
                    <div
                      className="kp-explore-card-image"
                      data-category={displayCategory(place.category)}
                    >
                      <div className="kp-explore-card-fallback" aria-hidden="true">
                        <CategoryFallbackIcon category={place.category} />
                        <b>{displayCategory(place.category)}</b>
                        <em>대표 사진 준비 중</em>
                      </div>
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
                    </div>

                    <div className="kp-explore-card-copy">
                      <span>
                        {[place.region, place.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <h2>{place.name}</h2>
                      <p>{place.address ?? "주소 정보가 없습니다."}</p>
                      <strong>KO-PICK 지도에서 위치 보기</strong>
                    </div>
                  </button>

                  <div className="kp-explore-external-actions">
                    <a
                      className="kp-explore-naver-map-link"
                      href={naverMapSearchUrl(
                        place.name,
                        place.address,
                        place.latitude,
                        place.longitude
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={place.name + " 네이버 지도에서 보기"}
                    >
                      네이버 지도에서 보기 ↗
                    </a>
                    <NaverBookingButton
                      name={place.name}
                      address={place.address}
                      category={place.category}
                      source="tour"
                      className="kp-explore-naver-booking-link"
                    />
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
            <span>지도: NAVER Maps</span>
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
            <span>{resultCategoryLabel}</span>
          </div>

          {!mapReady && !mapError && (
            <div className="kp-explore-map-state">
              네이버 지도를 불러오는 중입니다.
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
