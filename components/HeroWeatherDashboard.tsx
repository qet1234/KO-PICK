"use client";

import { useEffect, useMemo, useState } from "react";

const regionDistricts: Record<string, string[]> = {
  서울: ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
  부산: ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
  대구: ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],
  인천: ["중구","동구","미추홀구","연수구","남동구","부평구","계양구","서구","강화군","옹진군"],
  광주: ["동구","서구","남구","북구","광산구"],
  대전: ["동구","중구","서구","유성구","대덕구"],
  울산: ["중구","남구","동구","북구","울주군"],
  세종: ["세종시"],
  경기: ["수원시","용인시","고양시","화성시","성남시","부천시","남양주시","안산시","평택시","안양시","시흥시","파주시","김포시","의정부시","광주시","하남시","광명시","군포시","양주시","오산시","이천시","안성시","구리시","의왕시","포천시","양평군","여주시","동두천시","과천시","가평군","연천군"],
  강원: ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
  충북: ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
  충남: ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
  전북: ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
  전남: ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
  경북: ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
  경남: ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
  제주: ["제주시","서귀포시"],
};

const regions = Object.keys(regionDistricts);

type HourlyWeather = {
  time: string;
  icon: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
};

type DailyWeather = {
  date: string;
  icon: string;
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
  condition: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  currentPrecipitation: number;
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

function formatDay(value: string, index: number) {
  if (index === 0) return "오늘";
  const date = new Date(`${value}T00:00:00+09:00`);
  return Number.isNaN(date.getTime())
    ? value.slice(5)
    : date.toLocaleDateString("ko-KR", { weekday: "short" });
}

export default function HeroWeatherDashboard() {
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("전체");
  const [weather, setWeather] = useState<WeatherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const districts = regionDistricts[region] ?? [];

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

  return (
    <article className="kp-weather-dashboard" aria-label="전국 실시간 날씨">
      <header className="kp-weather-dashboard-header">
        <div>
          <small>LIVE KOREA WEATHER</small>
          <h1>전국 실시간 날씨</h1>
          <p>시·도를 선택한 뒤 시·군·구를 골라 상세 날씨를 확인하세요.</p>
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
          <section className="kp-weather-now">
            <div className="kp-weather-now-primary">
              <span className="kp-weather-now-icon" aria-hidden="true">{weather.icon}</span>
              <div>
                <small>{weather.locationName}</small>
                <strong>{weather.temperature}°</strong>
                <p>{weather.condition} · 체감 {weather.apparentTemperature}°</p>
              </div>
            </div>
            <div className="kp-weather-now-metrics">
              <span><small>습도</small><strong>{weather.humidity}%</strong></span>
              <span><small>강수</small><strong>{weather.currentPrecipitation}mm</strong></span>
              <span><small>풍속</small><strong>{weather.windSpeed}km/h</strong></span>
              <span><small>오늘</small><strong>{weather.maxTemperature}° / {weather.minTemperature}°</strong></span>
            </div>
          </section>

          <section className="kp-weather-hourly-section">
            <div className="kp-weather-section-title"><strong>시간대별 예보</strong><span>강수확률 포함</span></div>
            <div className="kp-weather-hourly-list">
              {weather.hourly.map((item) => (
                <article key={item.time}>
                  <small>{formatHour(item.time)}</small><span aria-hidden="true">{item.icon}</span><strong>{item.temperature}°</strong><em>강수 {item.precipitationProbability}%</em>
                </article>
              ))}
            </div>
          </section>

          <section className="kp-weather-weekly-section">
            <div className="kp-weather-section-title"><strong>7일 예보</strong><span>{weather.condition}</span></div>
            <div className="kp-weather-weekly-list">
              {weather.daily.map((item, index) => (
                <article key={item.date}>
                  <small>{formatDay(item.date, index)}</small><span aria-hidden="true">{item.icon}</span><strong>{item.maxTemperature}°</strong><em>{item.minTemperature}°</em><b>{item.precipitationProbability}%</b>
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
