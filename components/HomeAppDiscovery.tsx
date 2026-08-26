"use client";

import { type FormEvent, useEffect, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";
import { trackKeywordSearch } from "@/utils/trackKeywordSearch";
import { koreaRegionDistricts, koreaRegions } from "@/utils/korea-region-districts";
import AppIcon from "@/components/AppIcon";

type TrendingPlace = {
  id: string;
  category: string;
  location: string;
  title: string;
  description?: string;
  viewCount?: number;
  detailCount?: number;
  outboundCount?: number;
  favoriteCount?: number;
};

const relationships = [
  { label: "혼자", icon: "♙" },
  { label: "커플", icon: "♥" },
  { label: "친구", icon: "♟" },
  { label: "가족", icon: "⌂" },
] as const;

const categories = [
  { label: "맛집", icon: "🍴", category: "음식", tone: "coral" },
  { label: "카페", icon: "☕", category: "카페", tone: "brown" },
  { label: "관광지", icon: "▣", category: "관광지", tone: "blue" },
  { label: "축제", icon: "✣", category: "축제", tone: "orange" },
] as const;

function exploreHref(category: string, region: string, query = "", district = "전체", locality = "", journey = "") {
  const params = new URLSearchParams({ category, region });
  if (query) params.set("query", query);
  if (journey) params.set("journey", journey);
  if (region !== "전국" && district !== "전체") params.set("district", district);
  if (locality) params.set("locality", locality);
  return `/explore?${params.toString()}`;
}

function resolveLocationInput(input: string, selectedRegion: string, selectedDistrict: string, selectedLocality: string) {
  let remaining = input.trim();
  let region = selectedRegion;
  let district = selectedDistrict;
  let locality = selectedLocality;
  const matchedRegion = koreaRegions.filter((item) => item !== "전국").find((item) => remaining.replace(/\s+/g, "").includes(item.replace(/\s+/g, "")));
  if (matchedRegion) {
    region = matchedRegion;
    district = "전체";
    locality = "";
    remaining = remaining.replace(matchedRegion, " ");
  }
  const districtPool = region === "전국"
    ? Object.entries(koreaRegionDistricts).flatMap(([regionName, districts]) => districts.map((districtName) => ({ regionName, districtName })))
    : (koreaRegionDistricts[region] ?? []).map((districtName) => ({ regionName: region, districtName }));
  const matches = districtPool.filter(({ districtName }) => remaining.replace(/\s+/g, "").includes(districtName.replace(/\s+/g, "")));
  const matchedDistrict = matches.length > 0 && new Set(matches.map((match) => match.regionName)).size === 1 ? matches[0] : null;
  if (matchedDistrict) {
    region = matchedDistrict.regionName;
    district = matchedDistrict.districtName;
    locality = "";
    remaining = remaining.replace(matchedDistrict.districtName, " ");
  }
  const localityToken = remaining.split(/\s+/).find((token) => /[읍면동리]$/.test(token));
  if (localityToken) {
    locality = localityToken;
    remaining = remaining.replace(localityToken, " ");
  }
  return { region, district, locality, query: remaining.replace(/\s+/g, " ").trim().replace(/^(맛집|음식점|장소)$/, "") };
}

function hasActivity(place: TrendingPlace) {
  return Number(place.viewCount ?? 0) + Number(place.detailCount ?? 0) + Number(place.outboundCount ?? 0) + Number(place.favoriteCount ?? 0) > 0;
}

export default function HomeAppDiscovery() {
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("전체");
  const [locality, setLocality] = useState("");
  const [query, setQuery] = useState("");
  const [popularPlaces, setPopularPlaces] = useState<TrendingPlace[]>([]);

  useEffect(() => {
    if (!springApiUrl) return;
    const controller = new AbortController();
    fetch(`${springApiUrl}/api/public/trending-places?limit=8`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const places = Array.isArray(payload?.places) ? (payload.places as TrendingPlace[]).filter(hasActivity).slice(0, 6) : [];
        setPopularPlaces(places);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resolved = resolveLocationInput(query.trim().slice(0, 80), region, district, locality);
    if (resolved.query) void trackKeywordSearch(resolved.query, "search");
    window.location.assign(exploreHref("음식", resolved.region, resolved.query, resolved.district, resolved.locality));
  };

  const locationLabel = [region, district === "전체" ? "" : district, locality].filter(Boolean).join(" ");

  return (
    <section className="kp-home-app" aria-label="장소 빠른 검색">
      <div className="kp-container">
        <div className="kp-app-location-row">
          <label className="kp-app-mobile-region">
            <span aria-hidden="true">●</span>
            <select
              aria-label="홈 지역 선택"
              value={region}
              onChange={(event) => { setRegion(event.target.value); setDistrict("전체"); setLocality(""); }}
            >
              {koreaRegions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <strong className="kp-app-desktop-location">● {locationLabel || "전국"}</strong>
          <span className="kp-app-location-help">원하는 지역의 장소를 찾아보세요</span>
          <span className="kp-app-weather"><b aria-hidden="true">☀️</b> 24° 맑음</span>
        </div>

        <form className="kp-app-search" onSubmit={submitSearch} role="search">
          <span aria-hidden="true"><AppIcon name="search" size={20} /></span>
          <input aria-label="지역 또는 음식점명 검색" onChange={(event) => setQuery(event.target.value)} placeholder="어디로 떠나볼까요?" type="search" value={query} />
          <button type="submit">검색</button>
        </form>

        <div className="kp-app-region-selects">
          <label><span>시·도</span><select value={region} onChange={(event) => { setRegion(event.target.value); setDistrict("전체"); setLocality(""); }}>{koreaRegions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>시·군·구</span><select disabled={region === "전국"} value={district} onChange={(event) => { setDistrict(event.target.value); setLocality(""); }}><option value="전체">{region === "전국" ? "시·도 먼저 선택" : `${region} 전체`}</option>{(koreaRegionDistricts[region] ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>읍·면·동</span><input disabled={region === "전국" || district === "전체"} onChange={(event) => setLocality(event.target.value.slice(0, 40))} placeholder="예: 역삼동" value={locality} /></label>
        </div>

        <section className="kp-app-block" aria-labelledby="relationship-title">
          <h2 id="relationship-title">누구와 함께?</h2>
          <div className="kp-app-relationships">{relationships.map((item) => <a href={exploreHref("전체", region, "", district, locality, item.label)} key={item.label}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></a>)}</div>
        </section>

        <section className="kp-app-block" aria-labelledby="category-title">
          <h2 id="category-title">어떤 곳을 찾으세요?</h2>
          <div className="kp-app-categories">{categories.map((item) => <a href={exploreHref(item.category, region, "", district, locality)} key={item.label}><span className={`is-${item.tone}`} aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></a>)}</div>
        </section>

        <a className="kp-app-map-preview" href={exploreHref("전체", region, "", district, locality)}>
          <div><strong>지금 여기, 인기 장소</strong><span>{locationLabel || "전국"} 지도에서 한눈에 보기</span></div>
          <i className="pin pin-one">1</i><i className="pin pin-two">2</i><i className="pin pin-three">3</i><i className="pin pin-four">4</i><i className="pin pin-five">5</i>
        </a>

        <div className="kp-app-feature-cards">
          <a href="/recommend"><span aria-hidden="true">🗺️</span><strong>코스 설정</strong><small>테마 맞춤 코스로 알차게 여행하기</small></a>
          <a className="is-office" href="/office-dining"><span>▣</span><strong>직장인 식사</strong><small>빠르고 간편하게 점심·회식 찾기</small></a>
          <a href="#seasonal-foods"><span>✿</span><strong>사계절 추천</strong><small>계절마다 꼭 맞는 장소를 추천해요</small></a>
        </div>

        {popularPlaces.length > 0 ? (
          <section className="kp-home-popular" aria-label="실시간 인기 장소">
            <div className="kp-home-popular-heading"><div><small>LIVE</small><h2>지금 많이 찾는 장소</h2></div><a href="/explore?category=전체">전체 보기 →</a></div>
            <div className="kp-home-popular-grid">{popularPlaces.map((place, index) => <a href={exploreHref(place.category, region, place.title, district, locality)} key={place.id}><span>{String(index + 1).padStart(2, "0")}</span><small>{place.location} · {place.category}</small><strong>{place.title}</strong><p>{place.description ?? "장소 정보 확인하기"}</p><b>지도에서 보기 ↗</b></a>)}</div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
