"use client";

import { useEffect, useRef, useState } from "react";
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
const foodTypes = [
  "전체", "한식", "고기·구이", "일식", "중식", "양식", "아시아", "분식",
  "해산물", "뷔페", "카페·디저트", "주점",
] as const;
const foodDetails: Record<string, readonly string[]> = {
  전체: ["전체", "백반·가정식", "국밥·탕", "고기", "초밥", "중화요리", "파스타", "분식", "해산물"],
  한식: ["전체", "백반·가정식", "국밥·탕", "찌개·전골", "한정식", "냉면·국수", "족발·보쌈", "닭요리"],
  "고기·구이": ["전체", "삼겹살", "소고기", "갈비", "곱창·막창", "닭갈비", "오리구이", "양꼬치"],
  일식: ["전체", "초밥", "돈카츠", "라멘", "우동·소바", "덮밥", "이자카야", "오마카세"],
  중식: ["전체", "짜장·짬뽕", "마라탕", "중화요리", "딤섬", "훠궈", "양꼬치"],
  양식: ["전체", "파스타", "피자", "스테이크", "햄버거", "브런치", "멕시칸"],
  아시아: ["전체", "베트남", "태국", "인도", "동남아", "중동"],
  분식: ["전체", "김밥", "떡볶이", "라면", "만두", "샌드위치"],
  해산물: ["전체", "회·사시미", "조개구이", "해물탕", "생선구이", "장어", "대게·킹크랩"],
  뷔페: ["전체", "한식뷔페", "샐러드바", "호텔뷔페", "고기뷔페", "초밥뷔페"],
  "카페·디저트": ["전체", "카페", "베이커리", "디저트", "아이스크림", "브런치카페"],
  주점: ["전체", "호프·맥주", "이자카야", "포차", "와인바", "전통주", "요리주점"],
};
const dinnerBudgets = ["1인 2만원 이하", "1인 3만원 이하", "1인 5만원 이하", "1인 7만원 이하", "1인 10만원 이상"];
const lunchBudgets = ["1인 1만원 이하", "1인 1.5만원 이하", "1인 2만원 이하", "1인 3만원 이하"];

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
  const [foodDetail, setFoodDetail] = useState("전체");
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
  const availableFoodDetails = foodDetails[foodType] ?? foodDetails.전체;
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
      const markerContent = document.createElement("div");
      markerContent.className = "od-map-marker";
      const markerName = document.createElement("span");
      markerName.textContent = place.name;
      const markerPin = document.createElement("i");
      markerPin.setAttribute("aria-hidden", "true");
      markerContent.append(markerName, markerPin);
      const marker = new maps.Marker({
        position,
        map,
        title: place.name,
        icon: { content: markerContent },
      });
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
  };

  const search = async () => {
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams({
        mode,
        region,
        district,
        officeArea: officeArea.trim(),
        foodType,
        foodDetail,
        headcount,
        budget,
      });
      const response = await fetch(`/api/naver/dining-search?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "네이버 음식점을 불러오지 못했습니다.");

      const nextPlaces = (payload.places ?? []) as Place[];
      setPlaces(nextPlaces);
      setSelectedId(nextPlaces[0]?.id ?? null);
      window.setTimeout(() => {
        mapContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } catch (nextError) {
      setPlaces([]);
      setSelectedId(null);
      setError(nextError instanceof Error ? nextError.message : "네이버 음식점을 불러오지 못했습니다.");
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
        <a className="od-brand" href="/"><span>?</span>오늘어디</a>
        <a className="od-back" href="/">홈으로</a>
      </header>

      <section className="od-hero">
        <div className="od-hero-copy">
          <p>OFFICE DINING</p>
          <h1>오늘 점심부터<br />팀 회식까지 한 번에</h1>
          <span>지역·음식 종류·금액대를 고르면 네이버 음식점명을 지도 마커로 바로 비교할 수 있습니다.</span>
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
              <span>{item === "회식" ? "인원·음식·금액대별" : "근처에서 부담 없는 한 끼"}</span>
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
        <ChoiceGroup
          label="음식 대분류"
          values={foodTypes}
          selected={foodType}
          onSelect={(value) => {
            setFoodType(value);
            setFoodDetail("전체");
          }}
        />
        <ChoiceGroup label="세부 분류" values={availableFoodDetails} selected={foodDetail} onSelect={setFoodDetail} />
        <ChoiceGroup label="금액대" values={budgets} selected={budget} onSelect={setBudget} />

        <div className="od-actions">
          <button className="od-search-button" type="button" disabled={loading} onClick={() => void search()}>
            {loading ? "식당을 찾고 있어요…" : `${mode} 장소 찾아보기`}
          </button>
        </div>
        <p className="od-data-note">여러 세부 음식 검색 결과를 합쳐 최대 50곳의 음식점명을 보여드립니다. 실제 메뉴 가격과 단체 수용 여부는 매장 상세에서 최종 확인해 주세요.</p>
      </section>

      <section className="od-results" aria-live="polite">
        <div className="od-map-panel">
          <div className="od-map-heading"><div><small>NAVER MAP</small><h2>음식점명과 마커로 비교하기</h2></div>{places.length > 0 && <span>{places.length}곳</span>}</div>
          {mapError && <div className="od-map-message">{mapError}</div>}
          <div className="od-map" ref={mapContainerRef} hidden={Boolean(mapError)} />
        </div>

        <div className="od-list-panel">
          <div className="od-list-heading"><small>NAVER RESTAURANTS</small><h2>{searched ? `${region}${district === "전체" ? "" : ` ${district}`} · ${foodDetail === "전체" ? foodType : foodDetail} · ${budget}` : "조건을 선택해 찾아보세요"}</h2></div>
          {error && <p className="od-error">{error}</p>}
          {searched && !loading && !error && places.length === 0 && <p className="od-empty">선택한 조건의 식당을 찾지 못했습니다. 회사·역·동네를 더 구체적으로 입력하거나 지역 범위를 넓혀 주세요.</p>}
          <div className="od-place-list">
            {places.map((place, index) => (
              <article className={selectedId === place.id ? "od-place-card is-selected" : "od-place-card"} key={place.id}>
                <button className="od-place-main" type="button" onClick={() => focusPlace(place)}>
                  <span className="od-place-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="od-place-copy"><small>{place.category}</small><strong>{place.name}</strong><span>{place.address ?? `${place.region} ${place.city ?? ""}`}</span></span>
                </button>
                <div className="od-place-actions">
                  <a href={naverMapSearchUrl(place.name, null, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">음식점명으로 보기</a>
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
