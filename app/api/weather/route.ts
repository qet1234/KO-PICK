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

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") || "서울";
  const requestedDate = request.nextUrl.searchParams.get("date") || "";
  const coordinates = regionCoordinates[region] ?? regionCoordinates.서울;

  const params = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    timezone: "Asia/Seoul",
    forecast_days: "16",
    current: "temperature_2m,apparent_temperature,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 600 },
    });

    if (!response.ok) throw new Error(`Weather API ${response.status}`);
    const payload = await response.json();
    const dates: string[] = payload.daily?.time ?? [];
    const index = requestedDate ? dates.indexOf(requestedDate) : 0;
    const selectedIndex = index >= 0 ? index : 0;
    const code = Number(payload.daily?.weather_code?.[selectedIndex] ?? payload.current?.weather_code ?? 0);
    const precipitation = Number(payload.daily?.precipitation_probability_max?.[selectedIndex] ?? 0);
    const max = Number(payload.daily?.temperature_2m_max?.[selectedIndex] ?? payload.current?.temperature_2m ?? 0);
    const min = Number(payload.daily?.temperature_2m_min?.[selectedIndex] ?? payload.current?.temperature_2m ?? 0);
    const indoorRecommended = precipitation >= 50 || [61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(code);

    return NextResponse.json({
      region,
      date: dates[selectedIndex] ?? requestedDate,
      icon: weatherIcon(code),
      condition: weatherLabel(code),
      temperature: Math.round(Number(payload.current?.temperature_2m ?? max)),
      apparentTemperature: Math.round(Number(payload.current?.apparent_temperature ?? max)),
      maxTemperature: Math.round(max),
      minTemperature: Math.round(min),
      precipitationProbability: precipitation,
      indoorRecommended,
      recommendation: indoorRecommended
        ? "비나 눈 가능성이 있어 실내 카페·전시·맛집을 추천해요."
        : "야외 관광지·축제·산책 장소를 둘러보기 좋은 날씨예요.",
    });
  } catch (error) {
    console.error("weather forecast failed", error);
    return NextResponse.json({ error: "날씨 정보를 불러오지 못했습니다." }, { status: 502 });
  }
}
