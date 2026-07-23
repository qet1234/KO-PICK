"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { trackKeywordSearch } from "@/utils/trackKeywordSearch";

const regions = ["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
const categories = [
  { value: "전체", label: "전체 장소" },
  { value: "음식", label: "맛집" },
  { value: "카페", label: "카페" },
  { value: "축제", label: "축제" },
  { value: "관광지", label: "관광지" },
];

type WeatherData = {
  region: string;
  date: string;
  updatedAt?: string;
  icon: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
  currentPrecipitation?: number;
  windSpeed?: number;
  indoorRecommended: boolean;
  recommendation: string;
};

type NationwideWeather = {
  region: string;
  icon: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  windSpeed: number;
  indoorRecommended: boolean;
  observedAt: string | null;
};

type NationwideWeatherResponse = {
  updatedAt: string;
  regions: NationwideWeather[];
};

function categoryFromKeyword(keyword: string) {
  if (keyword.includes("카페")) return "카페";
  if (keyword.includes("음식") || keyword.includes("맛집")) return "음식";
  if (keyword.includes("축제")) return "축제";
  if (keyword.includes("관광") || keyword.includes("여행")) return "관광지";
  return "전체";
}

function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function updatedTime(value?: string) {
  if (!value) return "실시간";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "실시간";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("서울");
  const [date, setDate] = useState(todayInKorea);
  const [partySize, setPartySize] = useState("2");
  const [category, setCategory] = useState("전체");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [nationwideWeather, setNationwideWeather] = useState<NationwideWeather[]>([]);
  const [nationwideUpdatedAt, setNationwideUpdatedAt] = useState("");
  const [nationwideLoading, setNationwideLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadNationwideWeather = async () => {
      setNationwideLoading(true);
      try {
        const response = await fetch("/api/weather?scope=all", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("nationwide weather request failed");
        const payload = (await response.json()) as NationwideWeatherResponse;
        setNationwideWeather(Array.isArray(payload.regions) ? payload.regions : []);
        setNationwideUpdatedAt(payload.updatedAt ?? "");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setNationwideWeather([]);
        }
      } finally {
        if (!controller.signal.aborted) setNationwideLoading(false);
      }
    };

    void loadNationwideWeather();
    const intervalId = window.setInterval(() => void loadNationwideWeather(), 10 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setWeatherLoading(true);
      try {
        const selectedRegion = region === "전국" ? "서울" : region;
        const params = new URLSearchParams({ region: selectedRegion, date });
        const response = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("weather request failed");
        setWeather((await response.json()) as WeatherData);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setWeather(null);
        }
      } finally {
        if (!controller.signal.aborted) setWeatherLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [region, date]);

  const selectedRealtimeWeather = useMemo(
    () => nationwideWeather.find((item) => item.region === region) ?? null,
    [nationwideWeather, region],
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.replace(/\s+/g, " ").trim();
    const selectedCategory = category === "전체" && normalized ? categoryFromKeyword(normalized) : category;
    if (normalized) void trackKeywordSearch(normalized, "search");

    const params = new URLSearchParams({ category: selectedCategory, region, partySize });
    if (normalized) params.set("keyword", normalized);
    if (date) params.set("date", date);
    if (weather?.indoorRecommended || selectedRealtimeWeather?.indoorRecommended) {
      params.set("weather", "indoor");
    }
    window.location.assign(`/explore?${params.toString()}`);
  };

  return (
    <form className="kp-catch-search" onSubmit={submitSearch}>
      <div className="kp-catch-search-heading">
        <div><small>PLACE FINDER</small><strong>어디로 갈까요?</strong></div>
        <span>전국 실시간 날씨를 비교하고 지역을 선택하세요.</span>
      </div>

      <section className="kp-nationwide-weather" aria-label="전국 실시간 날씨">
        <div className="kp-nationwide-weather-heading">
          <div>
            <small>LIVE WEATHER · 전국 17개 시·도</small>
            <strong>전국 실시간 날씨</strong>
          </div>
          <span>{updatedTime(nationwideUpdatedAt)} 기준 · 10분마다 갱신</span>
        </div>

        {nationwideLoading ? (
          <div className="kp-weather-loading">전국 날씨를 불러오고 있어요.</div>
        ) : nationwideWeather.length > 0 ? (
          <div className="kp-nationwide-weather-list">
            {nationwideWeather.map((item) => (
              <button
                type="button"
                className={region === item.region ? "is-active" : ""}
                aria-pressed={region === item.region}
                key={item.region}
                onClick={() => setRegion(item.region)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <strong>{item.region}</strong>
                  <small>{item.condition}</small>
                </div>
                <b>{item.temperature}°</b>
              </button>
            ))}
          </div>
        ) : (
          <div className="kp-weather-loading">전국 날씨를 불러오지 못했습니다.</div>
        )}
      </section>

      <div className="kp-weather-strip" aria-live="polite">
        {weatherLoading ? (
          <div className="kp-weather-loading">선택 지역의 상세 날씨를 확인하고 있어요.</div>
        ) : weather ? (
          <>
            <div className="kp-weather-main">
              <span className="kp-weather-icon" aria-hidden="true">{weather.icon}</span>
              <div>
                <small>{weather.region} · {weather.date}</small>
                <strong>{weather.condition} · {weather.temperature}°</strong>
              </div>
            </div>
            <div className="kp-weather-metrics">
              <span>체감 {weather.apparentTemperature}°</span>
              <span>최고 {weather.maxTemperature}°</span>
              <span>최저 {weather.minTemperature}°</span>
              <span>강수 {weather.precipitationProbability}%</span>
              {typeof weather.windSpeed === "number" && <span>바람 {weather.windSpeed}km/h</span>}
            </div>
            <p className={weather.indoorRecommended ? "is-indoor" : "is-outdoor"}>{weather.recommendation}</p>
          </>
        ) : (
          <div className="kp-weather-loading">날씨를 불러오지 못했지만 장소 검색은 계속 사용할 수 있어요.</div>
        )}
      </div>

      <div className="kp-catch-search-fields">
        <label><span>지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label><span>날짜</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="방문 날짜" /></label>
        <label><span>인원</span><select value={partySize} onChange={(event) => setPartySize(event.target.value)}><option value="1">1명</option><option value="2">2명</option><option value="3">3명</option><option value="4">4명</option><option value="5">5명</option><option value="6+">6명 이상</option></select></label>
        <label><span>카테고리</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      </div>

      <div className="kp-catch-search-query">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 장소 또는 원하는 분위기를 검색하세요" aria-label="장소 검색어" />
        <button type="submit">장소 찾기</button>
      </div>

      <div className="kp-catch-search-quick" aria-label="빠른 검색 조건">
        <button type="button" onClick={() => { setCategory("음식"); setQuery("혼밥"); setPartySize("1"); }}>혼밥</button>
        <button type="button" onClick={() => { setCategory("카페"); setQuery("데이트 카페"); setPartySize("2"); }}>데이트</button>
        <button type="button" onClick={() => { setCategory("음식"); setQuery("친구 모임"); setPartySize("4"); }}>친구 모임</button>
        <button type="button" onClick={() => { setCategory("관광지"); setQuery("가족과 가기 좋은 곳"); setPartySize("4"); }}>가족 나들이</button>
      </div>
    </form>
  );
}
