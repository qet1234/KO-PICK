"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";
import {
  loadNaverMaps,
  naverMapAppRouteUrl,
  naverMapSearchUrl,
  naverMapsApi,
  type NaverInfoWindowInstance,
  type NaverMapInstance,
  type NaverMarkerInstance,
} from "@/utils/naver-maps";
import { tourPlacesApiUrl } from "@/utils/spring-api";

type DiningMode = "회식" | "점심";

type Place = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

const regions = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const headcounts = ["2~4명", "5~8명", "9~12명", "13~20명", "21명 이상"];
const foodTypes = ["전체", "한식", "고기·구이", "일식", "중식", "양식", "해산물", "주점"];
const parkingOptions = ["상관없음", "주차 가능", "발렛파킹"];
const dinnerBudgets = ["1인 2만원 이하", "1인 3만원 이하", "1인 5만원 이하", "1인 7만원 이하", "1인 10만원 이상"];
const lunchBudgets = ["1인 1만원 이하", "1인 1.5만원 이하", "1인 2만원 이하", "1인 3만원 이하"];

const tourDetailByFood: Record<string, string> = {
  한식: "한식",
  "고기·구이": "한식",
  일식: "일식",
  중식: "중식",
  양식: "양식",
  해산물: "해산물",
  주점: "주점",
};

function makeConditionQuery({
  mode,
  region,
  district,
  officeArea,
  headcount,
  foodType,
  parking,
  budget,
}: {
  mode: DiningMode;
  region: string;
  district: string;
  officeArea: string;
  headcount: string;
  foodType: string;
  parking: string;
  budget: string;
}) {
  return [
    region,
    district === "전체" ? "" : district,
    officeArea.trim(),
    foodType === "전체" ? "맛집" : foodType,
    mode === "회식" ? `${headcount} 회식` : "직장인 점심",
    parking === "상관없음" ? "" : parking,
    budget,
  ].filter(Boolean).join(" ");
}

export default function OfficeDiningFinder() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const markersRef = useRef<NaverMarkerInstance[]>([]);
  const infoWindowRef = useRef<NaverInfoWindowInstance | null>(null);
  const [mode, setMode] = useState<DiningMode>("회식");
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("전체");
  const [officeArea, setOfficeArea] = useState("");
  const [headcount, setHeadcount] = useState("5~8명");
  const [foodType, setFoodType] = useState("전체");
  const [parking, setParking] = useState("상관없음");
  const [budget, setBudget] = useState("1인 3만원 이하");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
      ? ""
      : "네이버 지도 Client ID가 설정되지 않았습니다."
  );

  const districts = koreaRegionDistricts[region] ?? [];
  const budgets = mode === "회식" ? dinnerBudgets : lunchBudgets;
  const conditionQuery = useMemo(
    () => makeConditionQuery({
      mode,
      region,
      district,
      officeArea,
      headcount,
      foodType,
      parking,
      budget,
    }),
    [mode, region, district, officeArea, headcount, foodType, parking, budget]
  );
  const conditionSearchUrl = `https://map.naver.com/p/search/${encodeURIComponent(conditionQuery)}`;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) return;

    let cancelled = false;
    loadNaverMaps(clientId)
      .then((maps) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;
        mapRef.current = new maps.Map(mapContainerRef.current, {
          center: new maps.LatLng(37.5665, 126.978),
          zoom: 11,
          mapTypeControl: true,
          mapDataControl: false,
          scaleControl: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.Position.TOP_RIGHT },
        });
        setMapReady(true);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setMapError(nextError instanceof Error ? nextError.message : "네이버 지도 연결에 실패했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const maps = naverMapsApi();
    const map = mapRef.current;
    if (!mapReady || !maps || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();
    const bounds = new maps.LatLngBounds();

    const markers = places.map((place) => {
      const position = new maps.LatLng(place.latitude, place.longitude);
      const marker = new maps.Marker({ position, map, title: place.name });
      bounds.extend(position);

      maps.Event.addListener(marker, "click", () => {
        setSelectedId(place.id);
        const content = document.createElement("div");
        content.className = "od-map-info";

        const title = document.createElement("strong");
        title.textContent = place.name;
        const address = document.createElement("span");
        address.textContent = place.address ?? "주소 정보 없음";
        const link = document.createElement("a");
        link.href = naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "네이버 지도에서 확인 ↗";
        content.append(title, address, link);

        infoWindowRef.current?.close();
        const infoWindow = new maps.InfoWindow({
          content,
          borderWidth: 0,
          backgroundColor: "transparent",
          disableAnchor: true,
          pixelOffset: new maps.Point(0, -10),
        });
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
      });
      return marker;
    });

    if (markers.length > 0) {
      map.fitBounds(bounds, { top: 70, right: 50, bottom: 70, left: 50 });
      if (markers.length === 1) map.setZoom(15);
    }
    markersRef.current = markers;
  }, [mapReady, places]);

  const selectMode = (nextMode: DiningMode) => {
    setMode(nextMode);
    setBudget(nextMode === "회식" ? "1인 3만원 이하" : "1인 1만원 이하");
    if (nextMode === "점심") setParking("상관없음");
  };

  const search = async () => {
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams({
        category: "음식",
        includeImages: "false",
        page: "1",
        pageSize: "30",
        region,
      });
      const detailType = tourDetailByFood[foodType];
      if (detailType) params.set("detailType", detailType);

      if (district !== "전체") {
        const subregionResponse = await fetch(
          `${tourPlacesApiUrl}?mode=subregions&region=${encodeURIComponent(region)}`
        );
        const subregionPayload = await subregionResponse.json();
        if (!subregionResponse.ok) {
          throw new Error(subregionPayload.error ?? "시·군·구 정보를 불러오지 못했습니다.");
        }
        const subregion = (subregionPayload.subregions ?? []).find(
          (item: { code?: string; name?: string }) => item.name === district
        );
        if (subregion?.code) params.set("sigunguCode", subregion.code);
      }

      const response = await fetch(`${tourPlacesApiUrl}?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "식당을 불러오지 못했습니다.");

      const nextPlaces = ((payload.places ?? []) as Place[]).filter((place) =>
        district === "전체" || [place.city, place.address].some((value) => value?.includes(district))
      );
      setPlaces(nextPlaces);
      setSelectedId(nextPlaces[0]?.id ?? null);
    } catch (nextError) {
      setPlaces([]);
      setSelectedId(null);
      setError(nextError instanceof Error ? nextError.message : "식당을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const focusPlace = (place: Place) => {
    setSelectedId(place.id);
    const maps = naverMapsApi();
    if (!maps || !mapRef.current) return;
    mapRef.current.panTo(new maps.LatLng(place.latitude, place.longitude));
    mapRef.current.setZoom(15);
    mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const startNaverRoute = (place: Place) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const routeUrl = naverMapAppRouteUrl(
      place.name,
      place.latitude,
      place.longitude,
      window.location.origin
    );

    if (isMobile && routeUrl) {
      window.location.href = routeUrl;
      return;
    }

    window.open(
      naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="od-page">
      <header className="od-header">
        <a className="od-brand" href="/"><span>K</span>코리아픽</a>
        <a className="od-back" href="/">홈으로</a>
      </header>

      <section className="od-hero">
        <div className="od-hero-copy">
          <p>OFFICE DINING</p>
          <h1>오늘 점심부터<br />팀 회식까지 한 번에</h1>
          <span>조건을 고르면 코리아픽 장소를 네이버 지도에 표시하고, 선택한 조건 그대로 네이버 지도에서도 찾아볼 수 있습니다.</span>
        </div>
        <div className="od-hero-steps" aria-label="이용 순서">
          <span><b>1</b>조건 선택</span><span><b>2</b>지도 비교</span><span><b>3</b>네이버 길찾기</span>
        </div>
      </section>

      <section className="od-builder" aria-labelledby="od-builder-title">
        <div className="od-mode-tabs" role="tablist" aria-label="식사 목적">
          {(["회식", "점심"] as DiningMode[]).map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={mode === item}
              className={mode === item ? "is-active" : ""}
              key={item}
              onClick={() => selectMode(item)}
            >
              <strong>{item === "회식" ? "팀 회식" : "빠른 점심"}</strong>
              <span>{item === "회식" ? "인원·주차·예산까지" : "근처에서 부담 없는 한 끼"}</span>
            </button>
          ))}
        </div>

        <div className="od-builder-heading">
          <div><small>{mode === "회식" ? "TEAM DINNER" : "QUICK LUNCH"}</small><h2 id="od-builder-title">어떤 식사를 찾으세요?</h2></div>
          <span className="od-live-badge">네이버 지도 연동</span>
        </div>

        <div className="od-form-grid">
          <label><span>시·도</span><select value={region} onChange={(event) => { setRegion(event.target.value); setDistrict("전체"); }}>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>시·군·구</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="전체">{region} 전체</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="od-office-input"><span>회사·역·동네 <em>선택</em></span><input value={officeArea} onChange={(event) => setOfficeArea(event.target.value)} placeholder="예: 강남역, 판교 테크노밸리" /></label>
        </div>

        {mode === "회식" && (
          <ChoiceGroup label="인원" values={headcounts} selected={headcount} onSelect={setHeadcount} />
        )}
        <ChoiceGroup label="음식 종류" values={foodTypes} selected={foodType} onSelect={setFoodType} />
        {mode === "회식" && (
          <ChoiceGroup label="주차" values={parkingOptions} selected={parking} onSelect={setParking} />
        )}
        <ChoiceGroup label="금액대" values={budgets} selected={budget} onSelect={setBudget} />

        <div className="od-actions">
          <button className="od-search-button" type="button" disabled={loading} onClick={() => void search()}>
            {loading ? "식당을 찾고 있어요…" : `${mode} 장소 찾아보기`}
          </button>
          <a className="od-naver-condition-button" href={conditionSearchUrl} target="_blank" rel="noopener noreferrer">N 선택 조건으로 네이버 지도 검색 ↗</a>
        </div>
        <p className="od-data-note">장소·주소·좌표는 한국관광공사 데이터입니다. 인원 수용, 실제 가격, 주차·발렛 제공 여부는 매장별로 달라 네이버 지도에서 최종 확인해 주세요.</p>
      </section>

      <section className="od-results" aria-live="polite">
        <div className="od-map-panel">
          <div className="od-map-heading"><div><small>NAVER MAP</small><h2>지도에서 비교하기</h2></div>{places.length > 0 && <span>{places.length}곳</span>}</div>
          {mapError && <div className="od-map-message">{mapError}</div>}
          <div className="od-map" ref={mapContainerRef} hidden={Boolean(mapError)} />
        </div>

        <div className="od-list-panel">
          <div className="od-list-heading"><small>RESTAURANT PICKS</small><h2>{searched ? `${region}${district === "전체" ? "" : ` ${district}`} 추천` : "조건을 선택해 찾아보세요"}</h2></div>
          {error && <p className="od-error">{error}</p>}
          {searched && !loading && !error && places.length === 0 && <p className="od-empty">선택한 지역의 식당을 찾지 못했습니다. 지역 범위를 넓히거나 네이버 조건 검색을 이용해 주세요.</p>}
          <div className="od-place-list">
            {places.map((place, index) => (
              <article className={selectedId === place.id ? "od-place-card is-selected" : "od-place-card"} key={place.id}>
                <button className="od-place-main" type="button" onClick={() => focusPlace(place)}>
                  <span className="od-place-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="od-place-copy"><small>{place.category}</small><strong>{place.name}</strong><span>{place.address ?? `${place.region} ${place.city ?? ""}`}</span></span>
                </button>
                <div className="od-place-actions">
                  <a href={naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">네이버 지도 보기</a>
                  <button type="button" onClick={() => startNaverRoute(place)}>네이버 길찾기</button>
                </div>
              </article>
            ))}
          </div>
          {places.length > 0 && <p className="od-route-note">모바일은 네이버 지도 앱 길찾기로 연결되며, PC는 네이버 장소 페이지에서 길찾기를 이어서 이용할 수 있습니다.</p>}
        </div>
      </section>
    </main>
  );
}

function ChoiceGroup({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <fieldset className="od-choice-group">
      <legend>{label}</legend>
      <div>
        {values.map((value) => (
          <button type="button" key={value} className={selected === value ? "is-active" : ""} aria-pressed={selected === value} onClick={() => onSelect(value)}>{value}</button>
        ))}
      </div>
    </fieldset>
  );
}
