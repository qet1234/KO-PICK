"use client";

import { type FormEvent, useEffect, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";
import { trackKeywordSearch } from "@/utils/trackKeywordSearch";
import { koreaRegionDistricts, koreaRegions } from "@/utils/korea-region-districts";

type TrendingPlace = {
  id: string;
  rank: number;
  category: string;
  location: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  viewCount?: number;
  detailCount?: number;
  outboundCount?: number;
  favoriteCount?: number;
};

const shortcuts: Array<{
  label: string;
  icon: string;
  tone: string;
  category?: string;
  href?: string;
}> = [
  { label: "맛집", icon: "식", category: "음식", tone: "coral" },
  { label: "카페", icon: "잔", category: "카페", tone: "amber" },
  { label: "관광지", icon: "길", category: "관광지", tone: "green" },
  { label: "축제", icon: "별", category: "축제", tone: "purple" },
  { label: "코스 설정", icon: "코", href: "/recommend", tone: "blue" },
  { label: "직장인 식사", icon: "회", href: "/office-dining", tone: "lime" },
] as const;

const themes = [
  { label: "데이트 카페", category: "카페", query: "데이트 카페" },
  { label: "가족 나들이", category: "관광지", query: "가족 나들이" },
  { label: "혼밥", category: "음식", query: "혼밥" },
  { label: "이번 주 축제", category: "축제", query: "축제" },
  { label: "비 오는 날", category: "카페", query: "실내" },
];

function exploreHref(category: string, region: string, query = "", district = "전체") {
  const params = new URLSearchParams({ category, region });
  if (query) params.set("query", query);
  if (region !== "전국" && district !== "전체") params.set("district", district);
  return `/explore?${params.toString()}`;
}

function hasActivity(place: TrendingPlace) {
  return (
    Number(place.viewCount ?? 0) +
    Number(place.detailCount ?? 0) +
    Number(place.outboundCount ?? 0) +
    Number(place.favoriteCount ?? 0)
  ) > 0;
}

export default function HomeDiscoveryHub() {
  const [region, setRegion] = useState("전국");
  const [district, setDistrict] = useState("전체");
  const [query, setQuery] = useState("");
  const [popularPlaces, setPopularPlaces] = useState<TrendingPlace[]>([]);

  useEffect(() => {
    if (!springApiUrl) return;
    const controller = new AbortController();
    fetch(`${springApiUrl}/api/public/trending-places?limit=8`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const places = Array.isArray(payload?.places)
          ? (payload.places as TrendingPlace[]).filter(hasActivity).slice(0, 6)
          : [];
        setPopularPlaces(places);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim().slice(0, 80);
    if (normalized) void trackKeywordSearch(normalized, "search");
    window.location.assign(exploreHref("전체", region, normalized, district));
  };

  return (
    <section className="kp-home-discovery" aria-label="장소 빠른 검색">
      <div className="kp-container">
        <div className="kp-home-discovery-hero">
          <div className="kp-home-discovery-copy">
            <p>오늘어디 PLACE DISCOVERY</p>
            <h1>오늘, 어디로<br />갈까요?</h1>
            <span>맛집부터 카페·축제·관광지까지 한 번에 찾아보세요.</span>
          </div>

          <div className="kp-home-search-card">
            <form onSubmit={submitSearch} role="search">
              <label htmlFor="home-place-query">장소·지역·음식 검색</label>
              <div>
                <span aria-hidden="true">⌕</span>
                <input
                  id="home-place-query"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="성수 파스타, 제주 오션뷰 카페"
                  type="search"
                  value={query}
                />
                <button type="submit">검색</button>
              </div>
            </form>

            <div className="kp-home-region-picker">
              <strong>시·도와 시·군·구로 찾기</strong>
              <div className="kp-home-region-selects">
                <label>
                  <span>시·도</span>
                  <select value={region} onChange={(event) => { setRegion(event.target.value); setDistrict("전체"); }}>
                    {koreaRegions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>시·군·구</span>
                  <select disabled={region === "전국"} value={district} onChange={(event) => setDistrict(event.target.value)}>
                    <option value="전체">{region === "전국" ? "시·도를 먼저 선택" : `${region} 전체`}</option>
                    {(koreaRegionDistricts[region] ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="kp-home-shortcuts" aria-label="주요 장소 카테고리">
          {shortcuts.map((shortcut) => (
            <a
              href={shortcut.href ?? exploreHref(shortcut.category ?? "전체", region, "", district)}
              key={shortcut.label}
            >
              <span className={`is-${shortcut.tone}`} aria-hidden="true">{shortcut.icon}</span>
              <strong>{shortcut.label}</strong>
            </a>
          ))}
        </div>

        <div className="kp-home-theme-row">
          <div>
            <small>QUICK PICKS</small>
            <strong>상황별로 빠르게 찾기</strong>
          </div>
          <nav aria-label="상황별 빠른 장소 찾기">
            {themes.map((theme) => (
              <a href={exploreHref(theme.category, region, theme.query, district)} key={theme.label}>
                {theme.label}
              </a>
            ))}
          </nav>
        </div>

        {popularPlaces.length > 0 && (
          <section className="kp-home-popular" aria-label="실시간 인기 장소">
            <div className="kp-home-popular-heading">
              <div><small>LIVE</small><h2>지금 많이 찾는 장소</h2></div>
              <a href="/explore?category=전체">전체 장소 보기 →</a>
            </div>
            <div className="kp-home-popular-grid">
              {popularPlaces.map((place, index) => (
                <a href={exploreHref(place.category, region, place.title, district)} key={place.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{place.location} · {place.category}</small>
                  <strong>{place.title}</strong>
                  <p>{place.description ?? "장소 정보 확인하기"}</p>
                  <b>지도에서 보기 ↗</b>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
