import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const regionCoordinates: Record<string, { latitude: number; longitude: number }> = {
  전국: { latitude: 36.5, longitude: 127.8 },
  서울: { latitude: 37.5665, longitude: 126.978 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  울산: { latitude: 35.5384, longitude: 129.3114 },
  세종: { latitude: 36.4801, longitude: 127.289 },
  경기: { latitude: 37.275, longitude: 127.009 },
  강원: { latitude: 37.8228, longitude: 128.1555 },
  충북: { latitude: 36.6357, longitude: 127.4917 },
  충남: { latitude: 36.6588, longitude: 126.6728 },
  전북: { latitude: 35.8203, longitude: 127.1088 },
  전남: { latitude: 34.8161, longitude: 126.4629 },
  경북: { latitude: 36.576, longitude: 128.5056 },
  경남: { latitude: 35.2383, longitude: 128.6924 },
  제주: { latitude: 33.4996, longitude: 126.5312 },
};

const nationwideRegions = Object.entries(regionCoordinates).filter(([region]) => region !== "전국");

function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if ([1, 2].includes(code)) return "대체로 맑음";
  if (code === 3) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57].includes(code)) return "이슬비";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([95, 96, 99].includes(code)) return "뇌우";
  return "날씨 확인";
}

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function indoorWeather(code: number, precipitationProbability = 0) {
  return precipitationProbability >= 50 || [61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(code);
}

async function fetchJson(url: string, revalidate = 600) {
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) throw new Error(`Weather API ${response.status}`);
  return response.json();
}

async function resolveCoordinates(region: string, district: string) {
  if (!district || district === "전체") {
    return { ...regionCoordinates[region], name: region };
  }

  const query = encodeURIComponent(`${district} ${region} 대한민국`);
  const payload = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=10&language=ko&format=json&countryCode=KR`,
    86400,
  );
  const results = Array.isArray(payload.results) ? payload.results : [];
  const match = results.find((item: { name?: string; admin1?: string; admin2?: string }) =>
    [item.name, item.admin1, item.admin2].some((value) => value?.includes(district)),
  ) ?? results[0];

  if (!match) return { ...regionCoordinates[region], name: `${region} ${district}` };
  return {
    latitude: Number(match.latitude),
    longitude: Number(match.longitude),
    name: `${region} ${district}`,
  };
}

async function nationwideWeather() {
  const params = new URLSearchParams({
    latitude: nationwideRegions.map(([, value]) => value.latitude).join(","),
    longitude: nationwideRegions.map(([, value]) => value.longitude).join(","),
    timezone: "Asia/Seoul",
    forecast_days: "1",
    current: "temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m",
  });
  const payload = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const locations = Array.isArray(payload) ? payload : [payload];
  return nationwideRegions.map(([region], index) => {
    const current = locations[index]?.current ?? {};
    const code = Number(current.weather_code ?? 0);
    return {
      region,
      icon: weatherIcon(code),
      condition: weatherLabel(code),
      temperature: Math.round(Number(current.temperature_2m ?? 0)),
      apparentTemperature: Math.round(Number(current.apparent_temperature ?? 0)),
      precipitation: Number(current.precipitation ?? 0),
      windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
      indoorRecommended: indoorWeather(code),
      observedAt: current.time ?? null,
    };
  });
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") || "single";

  try {
    if (scope === "all") {
      return NextResponse.json({ updatedAt: new Date().toISOString(), regions: await nationwideWeather() });
    }

    const region = request.nextUrl.searchParams.get("region") || "서울";
    const district = request.nextUrl.searchParams.get("district") || "전체";
    const requestedDate = request.nextUrl.searchParams.get("date") || "";
    const location = await resolveCoordinates(region, district);

    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timezone: "Asia/Seoul",
      forecast_days: "14",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    });

    const payload = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
    const dates: string[] = payload.daily?.time ?? [];
    const dateIndex = requestedDate ? dates.indexOf(requestedDate) : 0;
    const selectedIndex = dateIndex >= 0 ? dateIndex : 0;
    const current = payload.current ?? {};
    const currentTime = String(current.time ?? "");
    const hourlyTimes: string[] = payload.hourly?.time ?? [];
    const currentHourKey = currentTime.slice(0, 13);
    const matchedHourIndex = hourlyTimes.findIndex(
      (time) => String(time).slice(0, 13) === currentHourKey,
    );
    const currentHourIndex = matchedHourIndex >= 0 ? matchedHourIndex : 0;
    const code = Number(payload.daily?.weather_code?.[selectedIndex] ?? current.weather_code ?? 0);
    const precipitationProbability = Number(payload.daily?.precipitation_probability_max?.[selectedIndex] ?? 0);
    const indoorRecommended = indoorWeather(code, precipitationProbability);

    const hourly = hourlyTimes
      .slice(currentHourIndex, currentHourIndex + 24)
      .map((time: string, index: number) => {
        const offset = currentHourIndex + index;
        const hourlyCode = Number(payload.hourly?.weather_code?.[offset] ?? 0);
        return {
          time,
          icon: weatherIcon(hourlyCode),
          condition: weatherLabel(hourlyCode),
          temperature: Math.round(Number(payload.hourly?.temperature_2m?.[offset] ?? 0)),
          apparentTemperature: Math.round(Number(payload.hourly?.apparent_temperature?.[offset] ?? 0)),
          precipitationProbability: Number(payload.hourly?.precipitation_probability?.[offset] ?? 0),
          windSpeed: Math.round(Number(payload.hourly?.wind_speed_10m?.[offset] ?? 0)),
        };
      });

    const daily = dates.map((date, index) => {
      const dailyCode = Number(payload.daily?.weather_code?.[index] ?? 0);
      return {
        date,
        icon: weatherIcon(dailyCode),
        condition: weatherLabel(dailyCode),
        maxTemperature: Math.round(Number(payload.daily?.temperature_2m_max?.[index] ?? 0)),
        minTemperature: Math.round(Number(payload.daily?.temperature_2m_min?.[index] ?? 0)),
        precipitationProbability: Number(payload.daily?.precipitation_probability_max?.[index] ?? 0),
        sunrise: payload.daily?.sunrise?.[index] ?? null,
        sunset: payload.daily?.sunset?.[index] ?? null,
      };
    });

    return NextResponse.json({
      region,
      district,
      locationName: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      date: dates[selectedIndex] ?? requestedDate,
      updatedAt: new Date().toISOString(),
      icon: weatherIcon(Number(current.weather_code ?? code)),
      condition: weatherLabel(Number(current.weather_code ?? code)),
      temperature: Math.round(Number(current.temperature_2m ?? 0)),
      apparentTemperature: Math.round(Number(current.apparent_temperature ?? 0)),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
      currentPrecipitation: Number(current.precipitation ?? 0),
      windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
      windDirection: Math.round(Number(current.wind_direction_10m ?? 0)),
      maxTemperature: Math.round(Number(payload.daily?.temperature_2m_max?.[selectedIndex] ?? 0)),
      minTemperature: Math.round(Number(payload.daily?.temperature_2m_min?.[selectedIndex] ?? 0)),
      precipitationProbability,
      indoorRecommended,
      recommendation: indoorRecommended
        ? "비나 눈 가능성이 있어 실내 카페·전시·맛집을 추천해요."
        : "야외 관광지·축제·산책 장소를 둘러보기 좋은 날씨예요.",
      hourly,
      daily,
    });
  } catch (error) {
    console.error("weather forecast failed", error);
    return NextResponse.json({ error: "날씨 정보를 불러오지 못했습니다." }, { status: 502 });
  }
}
