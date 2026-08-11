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
  { label: "데이트 카페", category: "카페", detail: "감성카페" },
  { label: "가족 나들이", category: "관광지", detail: "공원" },
  { label: "혼밥", category: "음식", detail: "간편식" },
  { label: "이번 주 축제", category: "축제" },
  { label: "비 오는 날", category: "관광지", detail: "미술관·전시관" },
];

function exploreHref(
  category: string,
  region: string,
  query = "",
  district = "전체",
  locality = "",
  detail = "",
  includeHours = false,
) {
  const params = new URLSearchParams({ category, region });
  if (query) params.set("query", query);
  if (region !== "전국" && district !== "전체") params.set("district", district);
  if (locality) params.set("locality", locality);
  if (detail) params.set("detail", detail);
  if (includeHours) params.set("includeHours", "true");
  return `/explore?${params.toString()}`;
}

function resolveLocationInput(input: string, selectedRegion: string, selectedDistrict: string, selectedLocality: string) {
  let remaining = input.trim();
  let region = selectedRegion;
  let district = selectedDistrict;
  let locality = selectedLocality;
  const matchedRegion = koreaRegions
    .filter((item) => item !== "전국")
    .find((item) => remaining.replace(/\s+/g, "").includes(item.replace(/\s+/g, "")));

  if (matchedRegion) {
    region = matchedRegion;
    district = "전체";
    locality = "";
    remaining = remaining.replace(matchedRegion, " ");
  }

  const districtPool = region === "전국"
    ? Object.entries(koreaRegionDistricts).flatMap(([regionName, districts]) =>
        districts.map((districtName) => ({ regionName, districtName })))
    : (koreaRegionDistricts[region] ?? []).map((districtName) => ({ regionName: region, districtName }));
  const matches = districtPool.filter(({ districtName }) =>
    remaining.replace(/\s+/g, "").includes(districtName.replace(/\s+/g, "")));
  const uniqueRegions = new Set(matches.map((match) => match.regionName));
  const matchedDistrict = matches.length > 0 && uniqueRegions.size === 1 ? matches[0] : null;

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
  const query = remaining.replace(/\s+/g, " ").trim().replace(/^(맛집|음식점|장소)$/, "");
  return { region, district, locality, query };
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
  const [locality, setLocality] = useState("");
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
    const resolved = resolveLocationInput(normalized, region, district, locality);
    if (resolved.query) void trackKeywordSearch(resolved.query, "search");
    window.location.assign(exploreHref("음식", resolved.region, resolved.query, resolved.district, resolved.locality));
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
              <label htmlFor="home-place-query">지역 또는 음식점명 검색</label>
              <div>
                <span aria-hidden="true">⌕</span>
                <input
                  id="home-place-query"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="서울 강남구, 성수 파스타"
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
                  <select value={region} onChange={(event) => { setRegion(event.target.value); setDistrict("전체"); setLocality(""); }}>
                    {koreaRegions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>시·군·구</span>
                  <select disabled={region === "전국"} value={district} onChange={(event) => { setDistrict(event.target.value); setLocality(""); }}>
                    <option value="전체">{region === "전국" ? "시·도를 먼저 선택" : `${region} 전체`}</option>
                    {(koreaRegionDistricts[region] ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>읍·면·동</span>
                  <input disabled={region === "전국" || district === "전체"} onChange={(event) => setLocality(event.target.value.slice(0, 40))} placeholder="예: 역삼동, 애월읍" value={locality} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="kp-home-shortcuts" aria-label="주요 장소 카테고리">
          {shortcuts.map((shortcut) => (
            <a
              href={shortcut.href ?? exploreHref(shortcut.category ?? "전체", region, "", district, locality)}
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
              <a href={exploreHref(theme.category, region, "", district, locality, theme.detail, true)} key={theme.label}>
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
                <a href={exploreHref(place.category, region, place.title, district, locality)} key={place.id}>
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
