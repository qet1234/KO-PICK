"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";

const regions = Object.keys(koreaRegionDistricts);

type WeatherVisualState = "sunny" | "cloudy" | "rainy";

type HourlyWeather = {
  time: string;
  icon: string;
  visualState: WeatherVisualState;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
};

type DailyWeather = {
  date: string;
  icon: string;
  visualState: WeatherVisualState;
  condition: string;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
};

type WeatherDashboardData = {
  region: string;
  district: string;
  locationName: string;
  updatedAt: string;
  icon: string;
  visualState: WeatherVisualState;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  currentPrecipitation: number;
  currentPrecipitationProbability: number;
  windSpeed: number;
  windDirection: number;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
  indoorRecommended: boolean;
  recommendation: string;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
};

function formatHour(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.slice(11, 16)
    : date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function seoulTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function forecastWeekRange(todayKey: string) {
  const today = new Date(`${todayKey}T00:00:00+09:00`);
  const day = today.getDay();

  if (day === 0) {
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + 1);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    return {
      startKey: dateKey(nextMonday),
      endKey: dateKey(nextSunday),
      title: "다음 주 예보",
      description: "다음 월요일~일요일 · 7일 전체",
    };
  }

  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() + (7 - day));
  return {
    startKey: todayKey,
    endKey: dateKey(thisSunday),
    title: "이번 주 예보",
    description: "월요일~일요일 · 지난 요일 제외",
  };
}

function formatWeekDay(value: string, todayKey: string) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;

  const weekday = date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  const monthDay = date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  });
  return value === todayKey ? `오늘 · ${monthDay}` : `${weekday} · ${monthDay}`;
}

function WeatherScene({
  state,
  label,
  compact = false,
}: {
  state: WeatherVisualState;
  label: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`kp-weather-scene is-${state}${compact ? " is-compact" : ""}`}
      role="img"
      aria-label={label}
    >
      <i className="kp-weather-scene-sun" />
      <i className="kp-weather-scene-cloud kp-weather-scene-cloud-main" />
      <i className="kp-weather-scene-cloud kp-weather-scene-cloud-small" />
      <i className="kp-weather-scene-rain"><b /><b /><b /></i>
    </span>
  );
}

export default function HeroWeatherDashboard() {
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("전체");
  const [weather, setWeather] = useState<WeatherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const hourlyListRef = useRef<HTMLDivElement>(null);

  const districts = koreaRegionDistricts[region] ?? [];
  const todayKey = seoulTodayKey();
  const weekRange = forecastWeekRange(todayKey);

  const remainingWeekForecast = useMemo(
    () => (weather?.daily ?? []).filter(
      (item) => item.date >= weekRange.startKey && item.date <= weekRange.endKey,
    ),
    [weekRange.endKey, weekRange.startKey, weather?.daily],
  );

  const activeHourly = weather?.hourly[selectedHourIndex] ?? weather?.hourly[0];
  const activeVisualState = activeHourly?.visualState ?? weather?.visualState ?? "sunny";
  const activeTemperature = activeHourly?.temperature ?? weather?.temperature ?? 0;
  const activeApparentTemperature = activeHourly?.apparentTemperature ?? weather?.apparentTemperature ?? 0;
  const activeCondition = activeHourly?.condition ?? weather?.condition ?? "날씨 확인";
  const activePrecipitationProbability = activeHourly?.precipitationProbability
    ?? weather?.currentPrecipitationProbability
    ?? 0;

  useEffect(() => {
    setDistrict("전체");
  }, [region]);

  useEffect(() => {
    const controller = new AbortController();

    const loadWeather = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ region, district });
        const response = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "날씨 조회 실패");
        setWeather(payload as WeatherDashboardData);
        setSelectedHourIndex(0);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setWeather(null);
          setError(requestError instanceof Error ? requestError.message : "날씨를 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadWeather();
    const intervalId = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [region, district]);

  useEffect(() => {
    hourlyListRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [weather?.updatedAt, region, district]);

  const exploreUrl = useMemo(() => {
    const params = new URLSearchParams({
      category: weather?.indoorRecommended ? "카페" : "관광지",
      region,
      keyword: weather?.indoorRecommended ? "실내 가볼만한 곳" : "야외 가볼만한 곳",
    });
    if (district !== "전체") params.set("district", district);
    if (weather?.indoorRecommended) params.set("weather", "indoor");
    return `/explore?${params.toString()}`;
  }, [district, region, weather?.indoorRecommended]);

  const moveHourlyForecast = (direction: -1 | 1) => {
    const list = hourlyListRef.current;
    if (!list) return;
    const distance = Math.max(260, Math.round(list.clientWidth * 0.82));
    list.scrollBy({ left: distance * direction, behavior: "smooth" });
  };

  return (
    <article className={`kp-weather-dashboard is-${activeVisualState}`} aria-label="전국 실시간 날씨">
      <header className="kp-weather-dashboard-header">
        <div>
          <small>LIVE KOREA WEATHER</small>
          <h1>전국 실시간 날씨</h1>
          <p>시간대별 강수확률에 따라 해·구름·비 화면이 자동으로 전환됩니다.</p>
        </div>
        <span className="kp-weather-live"><i />10분 자동 갱신</span>
      </header>

      <section className="kp-weather-location-controls" aria-label="날씨 지역 선택">
        <label>
          <span>시·도 선택</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {regions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>시·군·구 선택</span>
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="전체">{region} 전체</option>
            {districts.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      {loading ? (
        <div className="kp-weather-dashboard-state">{region} {district === "전체" ? "" : district} 실시간 날씨를 불러오고 있습니다.</div>
      ) : error || !weather ? (
        <div className="kp-weather-dashboard-state is-error">{error || "날씨를 불러오지 못했습니다."}</div>
      ) : (
        <>
          <section className={`kp-weather-now is-${activeVisualState}`}>
            <div className="kp-weather-now-primary">
              <WeatherScene state={activeVisualState} label={activeCondition} />
              <div>
                <small>
                  {weather.locationName} · {selectedHourIndex === 0 ? "현재" : `${formatHour(activeHourly?.time ?? "")} 예보`}
                </small>
                <strong>{activeTemperature}°</strong>
                <p>{activeCondition} · 체감 {activeApparentTemperature}° · 강수 {activePrecipitationProbability}%</p>
              </div>
            </div>
            <div className="kp-weather-now-metrics">
              <span><small>강수확률</small><strong>{activePrecipitationProbability}%</strong></span>
              <span><small>습도</small><strong>{weather.humidity}%</strong></span>
              <span><small>풍속</small><strong>{selectedHourIndex === 0 ? weather.windSpeed : activeHourly?.windSpeed ?? weather.windSpeed}km/h</strong></span>
              <span><small>오늘</small><strong>{weather.maxTemperature}° / {weather.minTemperature}°</strong></span>
            </div>
          </section>

          <section className="kp-weather-hourly-section">
            <div className="kp-weather-section-title kp-weather-hourly-title">
              <div>
                <strong>시간대별 예보</strong>
                <span>0~29% 해 · 30~59% 구름 · 60% 이상 비</span>
              </div>
              <div className="kp-weather-hourly-controls" aria-label="시간대별 예보 이동">
                <button type="button" onClick={() => moveHourlyForecast(-1)} aria-label="이전 시간대 보기">←</button>
                <button type="button" onClick={() => moveHourlyForecast(1)} aria-label="다음 시간대 보기">→</button>
              </div>
            </div>
            <div className="kp-weather-hourly-list" ref={hourlyListRef} tabIndex={0} aria-label="현재부터 24시간 예보">
              {weather.hourly.map((item, index) => (
                <button
                  type="button"
                  key={item.time}
                  className={`${index === 0 ? "is-current " : ""}${index === selectedHourIndex ? "is-selected " : ""}is-${item.visualState}`}
                  onClick={() => setSelectedHourIndex(index)}
                  onFocus={() => setSelectedHourIndex(index)}
                  onMouseEnter={() => setSelectedHourIndex(index)}
                  aria-pressed={index === selectedHourIndex}
                  aria-label={`${index === 0 ? "현재" : formatHour(item.time)} ${item.condition}, ${item.temperature}도, 강수확률 ${item.precipitationProbability}%`}
                >
                  <small>{index === 0 ? "현재" : formatHour(item.time)}</small>
                  <WeatherScene state={item.visualState} label={item.condition} compact />
                  <strong>{item.temperature}°</strong>
                  <em>강수 {item.precipitationProbability}%</em>
                </button>
              ))}
            </div>
          </section>

          <section className="kp-weather-weekly-section">
            <div className="kp-weather-section-title">
              <strong>{weekRange.title}</strong>
              <span>{weekRange.description}</span>
            </div>
            <div className="kp-weather-weekly-list">
              {remainingWeekForecast.map((item) => (
                <article key={item.date} className={`is-${item.visualState}`}>
                  <small>{formatWeekDay(item.date, todayKey)}</small>
                  <span aria-hidden="true">{item.icon}</span>
                  <strong>{item.maxTemperature}°</strong>
                  <em>{item.minTemperature}°</em>
                  <b>{item.precipitationProbability}%</b>
                </article>
              ))}
            </div>
          </section>

          <footer className="kp-weather-dashboard-footer">
            <div><small>WEATHER PICK</small><strong>{weather.recommendation}</strong></div>
            <a href={exploreUrl}>날씨 맞춤 장소 보기 →</a>
          </footer>
        </>
      )}
    </article>
  );
}
