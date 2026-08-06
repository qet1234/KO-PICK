"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";
import { prepareKakaoShare, shareCourseOnKakao } from "@/utils/kakao-share";
import type { CreatedCourseShare, OwnedCourseShare } from "@/utils/course-share";
import "./recommend.css";

type Place = {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  mapUrl: string;
  reservationUrl: string;
  score: number;
  reason: string;
  source: string;
  imageUrl: string | null;
  imageCopyrightCode: "Type1" | "Type3" | null;
  imageLicenseLabel: string | null;
  imageAttribution: string | null;
  imageModificationAllowed: boolean;
  imageLicenseUrl: string | null;
  imageSourceUrl: string | null;
};

type FormState = {
  mode: "single" | "course";
  scope: string;
  region: string;
  district: string;
  relationship: string;
  date: string;
  duration: string;
  category: string;
  mood: string;
  indoor: string;
  distance: string;
  budget: string;
};

type PreferenceState = {
  pace: string;
  crowd: string;
  discovery: string;
  activity: string;
  foodStyle: string;
};

type WeatherSnapshot = {
  condition: string;
  precipitationProbability: number;
  maxTemperature: number;
  minTemperature: number;
  indoorRecommended: boolean;
};

type CourseBundle = {
  id: string;
  region: string;
  title: string;
  duration: string;
  items: Place[];
};

type SavedItinerary = {
  id: string;
  savedAt: string;
  title: string;
  form: FormState;
  places: Place[];
  weather: WeatherSnapshot | null;
};

function seoulDateKey(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const initialForm: FormState = {
  mode: "course",
  scope: "내 지역",
  region: "경기",
  district: "전체",
  relationship: "커플",
  date: seoulDateKey(),
  duration: "반나절",
  category: "카페",
  mood: "조용한",
  indoor: "실내",
  distance: "3km",
  budget: "5만원",
};

const initialPreferences: PreferenceState = {
  pace: "여유롭게",
  crowd: "한적한 곳",
  discovery: "검증된 인기 장소",
  activity: "휴식 중심",
  foodStyle: "익숙한 취향",
};

const regionChoices = [
  "전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const choices = {
  mode: ["course", "single"],
  relationship: ["개인", "커플", "친구", "가족"],
  duration: ["2시간", "반나절", "하루"],
  category: ["맛집", "카페", "축제", "관광지"],
  mood: ["조용한", "활기찬", "감성적인", "뷰가 좋은"],
  indoor: ["실내", "야외"],
  distance: ["1km", "3km", "5km", "10km"],
  budget: ["1만원", "2만원", "3만원", "4만원", "5만원", "6만원", "7만원", "8만원", "9만원", "10만원"],
} as const;

const preferenceChoices = {
  pace: ["여유롭게", "알차게"],
  crowd: ["한적한 곳", "사람 많은 곳"],
  discovery: ["검증된 인기 장소", "새로운 숨은 장소"],
  activity: ["휴식 중심", "체험 중심"],
  foodStyle: ["익숙한 취향", "새로운 맛 도전"],
} as const;

const PREFERENCE_KEY = "kopick-recommend-preferences";
const SAVED_ITINERARY_KEY = "kopick-saved-itineraries";
const RECOMMENDATION_LIMIT = 12;

function modeLabel(mode: FormState["mode"]) {
  return mode === "course" ? "맞춤 코스" : "한 곳 추천";
}

function purposeFor(relationship: string) {
  return ({ 개인: "혼자 외출", 커플: "데이트", 친구: "친구 모임", 가족: "가족 나들이" } as Record<string, string>)[relationship] || "외출";
}

function courseTime(index: number, duration: string) {
  const schedules: Record<string, string[]> = {
    "2시간": ["START", "+ 40분", "+ 80분"],
    반나절: ["11:00", "12:30", "14:30", "16:30"],
    하루: ["10:00", "11:30", "13:00", "15:00", "17:00", "19:00"],
  };
  return schedules[duration]?.[index] || `STOP ${index + 1}`;
}

export default function RecommendPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [preferences, setPreferences] = useState<PreferenceState>(initialPreferences);
  const [step, setStep] = useState<"preferences" | "situation" | "results">("preferences");
  const [places, setPlaces] = useState<Place[]>([]);
  const [courses, setCourses] = useState<CourseBundle[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [variation, setVariation] = useState(0);
  const [activeShares, setActiveShares] = useState<OwnedCourseShare[]>([]);
  const [latestShare, setLatestShare] = useState<CreatedCourseShare | null>(null);
  const [latestShareDescription, setLatestShareDescription] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(PREFERENCE_KEY);
        if (saved) {
          setPreferences({ ...initialPreferences, ...(JSON.parse(saved) as Partial<PreferenceState>) });
          setStep("situation");
        }
        const savedCourses = JSON.parse(localStorage.getItem(SAVED_ITINERARY_KEY) || "[]") as SavedItinerary[];
        setSavedItineraries(Array.isArray(savedCourses) ? savedCourses.slice(0, 8) : []);
      } catch {
        localStorage.removeItem(PREFERENCE_KEY);
        localStorage.removeItem(SAVED_ITINERARY_KEY);
      } finally {
        setProfileLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    const loadShares = async () => {
      const response = await fetch("/api/course-shares", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json() as { shares?: OwnedCourseShare[] };
      setActiveShares(Array.isArray(data.shares) ? data.shares : []);
    };
    void loadShares();
  }, []);

  const visiblePlaces = useMemo(
    () => form.mode === "course" ? places : places.slice(0, RECOMMENDATION_LIMIT),
    [form.mode, places],
  );

  const visibleCourses = useMemo(() => {
    if (form.mode !== "course") return [];
    if (courses.length > 0) return courses;
    return places.length > 0 ? [{
      id: `${form.region}-${form.duration}`,
      region: form.region,
      title: `${form.region} ${form.relationship} ${form.duration} 코스`,
      duration: form.duration,
      items: places,
    }] : [];
  }, [courses, form.duration, form.mode, form.region, form.relationship, places]);

  const profileSummary = useMemo(
    () => Object.values(preferences).join(" · "),
    [preferences],
  );

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectRegion = (region: string) => {
    setVariation(0);
    setForm((prev) => ({
      ...prev,
      region,
      district: "전체",
      scope: region === "전국" ? "전국" : "내 지역",
    }));
  };

  const updatePreference = (key: keyof PreferenceState, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const savePreferences = () => {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    setStep("situation");
  };

  const getWeather = async () => {
    if (form.region === "전국") return null;
    const query = new URLSearchParams({ region: form.region, district: form.district, date: form.date });
    const response = await fetch(`/api/weather?${query}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as {
      indoorRecommended?: boolean;
      daily?: Array<{
        date: string;
        condition: string;
        precipitationProbability: number;
        maxTemperature: number;
        minTemperature: number;
      }>;
    };
    const selectedDay = data.daily?.find((day) => day.date === form.date) ?? data.daily?.[0];
    if (!selectedDay) return null;
    return {
      condition: selectedDay.condition,
      precipitationProbability: selectedDay.precipitationProbability,
      maxTemperature: selectedDay.maxTemperature,
      minTemperature: selectedDay.minTemperature,
      indoorRecommended: selectedDay.precipitationProbability >= 50 || Boolean(data.indoorRecommended),
    } satisfies WeatherSnapshot;
  };

  const recommend = async (nextVariation = variation) => {
    setLoading(true);
    setError("");
    setNotice("");
    setSelected(null);

    try {
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
      const forecast = await getWeather().catch(() => null);
      setWeather(forecast);
      const query = new URLSearchParams({
        ...form,
        ...preferences,
        weatherCondition: forecast?.condition || "",
        weatherIndoor: String(forecast?.indoorRecommended ?? form.indoor === "실내"),
        resultCount: String(RECOMMENDATION_LIMIT),
        variation: String(nextVariation),
      });
      const response = await fetch(`/api/recommend?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "추천 장소를 불러오지 못했습니다.");
      setPlaces(data.items || []);
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      if (!data.items?.length) {
        setError("조건에 맞는 장소를 찾지 못했습니다. 지역이나 카테고리를 바꿔보세요.");
        return;
      }
      if (form.region === "전국") {
        setNotice("전국 결과는 장거리 이동으로 연결하지 않고, 각 지역 안에서 이동하기 좋은 코스로 나눠 보여드려요.");
      } else if (!forecast) {
        setNotice("날씨 예보를 불러오지 못해 선택한 취향과 장소 정보만으로 추천했어요.");
      }
      setStep("results");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "추천 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const savePlace = (place: Place) => {
    const saved = JSON.parse(localStorage.getItem("kopick-saved-places") || "[]") as Place[];
    if (!saved.some((item) => item.id === place.id)) {
      localStorage.setItem("kopick-saved-places", JSON.stringify([place, ...saved]));
    }
    setSelected(place.id);
    setNotice("장소를 이 기기에 저장했습니다.");
  };

  const itineraryTitle = (course?: CourseBundle) => `${form.date} ${course?.region || form.region} ${form.relationship} ${form.duration} 코스`;

  const saveItinerary = (course?: CourseBundle) => {
    const title = itineraryTitle(course);
    const itinerary: SavedItinerary = {
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
      title,
      form,
      places: course?.items || visiblePlaces,
      weather,
    };
    const next = [itinerary, ...savedItineraries].slice(0, 8);
    localStorage.setItem(SAVED_ITINERARY_KEY, JSON.stringify(next));
    setSavedItineraries(next);
    setNotice("완성된 코스를 이 기기에 저장했습니다.");
  };

  const shareItinerary = async (course?: CourseBundle) => {
    if (sharing) return;
    const region = course?.region || form.region;
    const duration = course?.duration || form.duration;
    const sharedPlaces = (course?.items || visiblePlaces).slice(0, 6);
    setSharing(true);
    setError("");
    try {
      const response = await fetch("/api/course-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, duration, places: sharedPlaces }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null) as { error?: string; share?: CreatedCourseShare } | null;
      if (!response.ok || !data?.share) throw new Error(data?.error || "공유 링크를 만들지 못했습니다.");

      const share = data.share;
      setLatestShare(share);
      setActiveShares((current) => [share, ...current.filter((item) => item.id !== share.id)]);
      const description = sharedPlaces.map((place) => place.name).join(" → ");
      setLatestShareDescription(description);
      setNotice("공개 링크를 만들었습니다. 아래 카카오톡으로 보내기 버튼을 눌러 공유하세요. 링크는 30일 뒤 자동 만료됩니다.");
      void prepareKakaoShare().catch((kakaoError) => console.error("카카오 SDK 준비 오류:", kakaoError));
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError(shareError instanceof Error ? shareError.message : "코스를 공유하지 못했습니다.");
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("공유 링크를 복사했습니다.");
    } catch {
      setError("링크를 복사하지 못했습니다.");
    }
  };

  const sendLatestShare = async () => {
    if (!latestShare) return;
    try {
      await shareCourseOnKakao({
        title: `오늘어디 · ${latestShare.title}`,
        description: latestShareDescription,
        url: latestShare.url,
      });
      setNotice("카카오톡 공유 화면을 열었습니다.");
    } catch (kakaoError) {
      try {
        if (navigator.share) {
          await navigator.share({ title: latestShare.title, text: latestShareDescription, url: latestShare.url });
          setNotice("기기 공유 화면을 열었습니다. 카카오 JavaScript 키가 설정되면 카카오톡으로 바로 공유할 수 있습니다.");
        } else {
          await navigator.clipboard.writeText(latestShare.url);
          setNotice("공유 링크를 복사했습니다.");
        }
      } catch (fallbackError) {
        if (fallbackError instanceof DOMException && fallbackError.name === "AbortError") return;
        setError("공유 화면을 열지 못했습니다.");
      }
      if (kakaoError instanceof Error && kakaoError.message !== "KAKAO_SDK_NOT_CONFIGURED") {
        console.error("카카오톡 공유 오류:", kakaoError);
      }
    }
  };

  const revokeShare = async (id: string) => {
    const response = await fetch(`/api/course-shares/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error || "공유 링크를 취소하지 못했습니다.");
      return;
    }
    setActiveShares((current) => current.filter((item) => item.id !== id));
    if (latestShare?.id === id) setLatestShare(null);
    setNotice("공유를 취소했습니다. 기존 링크는 더 이상 열리지 않습니다.");
  };

  const deleteItinerary = (id: string) => {
    const next = savedItineraries.filter((item) => item.id !== id);
    localStorage.setItem(SAVED_ITINERARY_KEY, JSON.stringify(next));
    setSavedItineraries(next);
  };

  const refreshNationwideCourses = () => {
    const nextVariation = variation + 1;
    setVariation(nextVariation);
    void recommend(nextVariation);
  };

  const voteUrl = (place: Place) => {
    const query = new URLSearchParams({
      placeName: place.name,
      placeId: place.id,
      category: place.category,
      address: place.address,
      date: form.date,
      purpose: purposeFor(form.relationship),
    });
    return `/reservations?${query}`;
  };

  if (!profileLoaded) return null;

  const scopeLabel = form.region;

  return (
    <main className="recommend-page">
      <header className="recommend-header">
        <a href="/" className="recommend-brand">
          <Image src="/brand-mark.svg" alt="" width={38} height={38} />
          오늘어디
        </a>
      </header>

      <section className="recommend-hero">
        <p className="recommend-eyebrow">오늘어디 PERSONAL CURATION</p>
        <h1>날씨까지 맞춘<br />오늘의 코스</h1>
        <p>지역·날짜·관계·취향을 고르면 TourAPI 장소와 예보를 조합해 이동하기 좋은 순서로 추천해 드려요.</p>
      </section>

      <nav className="recommend-steps" aria-label="추천 단계">
        <span className={step === "preferences" ? "is-active" : ""}>1. 내 성향</span>
        <span className={step === "situation" ? "is-active" : ""}>2. 날짜와 조건</span>
        <span className={step === "results" ? "is-active" : ""}>3. 코스 완성</span>
      </nav>

      {error && <p className="recommend-message is-error">{error}</p>}
      {notice && <p className="recommend-message is-success">{notice}</p>}

      {step === "preferences" && (
        <section className="recommend-builder preference-builder">
          <div className="builder-heading">
            <div><p className="recommend-eyebrow">MY PREFERENCE</p><h2>어떤 장소를 좋아하나요?</h2></div>
            <p>선택한 성향은 이 기기에 저장되며 언제든 다시 바꿀 수 있어요.</p>
          </div>
          <Choice label="일정 스타일" values={preferenceChoices.pace} selected={preferences.pace} onSelect={(value) => updatePreference("pace", value)} />
          <Choice label="사람이 많은 곳은 어떤가요?" values={preferenceChoices.crowd} selected={preferences.crowd} onSelect={(value) => updatePreference("crowd", value)} />
          <Choice label="장소 선택 방식" values={preferenceChoices.discovery} selected={preferences.discovery} onSelect={(value) => updatePreference("discovery", value)} />
          <Choice label="선호하는 활동" values={preferenceChoices.activity} selected={preferences.activity} onSelect={(value) => updatePreference("activity", value)} />
          <Choice label="음식 취향" values={preferenceChoices.foodStyle} selected={preferences.foodStyle} onSelect={(value) => updatePreference("foodStyle", value)} />
          <button className="recommend-submit" onClick={savePreferences}>이 성향으로 코스 만들기 →</button>
        </section>
      )}

      {step === "situation" && (
        <section className="recommend-builder">
          <div className="saved-profile">
            <div><small>저장된 내 성향</small><strong>{profileSummary}</strong></div>
            <button type="button" onClick={() => setStep("preferences")}>성향 다시 설정</button>
          </div>

          <Choice label="어떤 결과가 필요한가요?" values={choices.mode} selected={form.mode} labels={{ course: "3~6곳 코스", single: "한 곳 추천" }} onSelect={(value) => update("mode", value as FormState["mode"])} />
          <Choice label="어디에서 찾을까요?" values={regionChoices} selected={form.region} onSelect={selectRegion} />

          {form.region !== "전국" && (
            <label className="region-field recommend-district-field">
              <span>시·군·구</span>
              <select value={form.district} onChange={(event) => update("district", event.target.value)}>
                <option value="전체">{form.region} 전체</option>
                {(koreaRegionDistricts[form.region] ?? []).map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <small>선택한 시·군·구의 후보가 부족하면 같은 시·도 안에서 가까운 코스 후보를 보완합니다.</small>
            </label>
          )}

          {form.scope === "전국" && (
            <div className="nationwide-notice">
              <strong>{form.mode === "course" ? "전국 지역별 코스 비교" : "전국 균형 추천"}</strong>
              <p>{form.mode === "course" ? "수도권·중부권·호남/제주권·영남권에서 최대 4개 코스를 한 번에 보여드려요. 각 코스는 한 지역 안의 3~6곳으로 구성합니다." : "17개 시·도를 고르게 검색한 뒤 취향에 잘 맞는 장소부터 보여드려요."}</p>
            </div>
          )}

          <div className="recommend-date-row">
            <label className="recommend-date-field">방문 날짜<input type="date" value={form.date} min={seoulDateKey()} max={seoulDateKey(13)} onChange={(event) => update("date", event.target.value)} required /></label>
            {form.mode === "course" && <Choice label="머무를 시간" values={choices.duration} selected={form.duration} onSelect={(value) => update("duration", value)} compact />}
          </div>

          <Choice label="누구와 가나요?" values={choices.relationship} selected={form.relationship} onSelect={(value) => update("relationship", value)} />
          <Choice label={form.mode === "course" ? "코스에 꼭 넣고 싶은 곳" : "무엇을 하고 싶나요?"} values={choices.category} selected={form.category} onSelect={(value) => update("category", value)} />
          <Choice label="원하는 분위기" values={choices.mood} selected={form.mood} onSelect={(value) => update("mood", value)} />

          <div className="recommend-row">
            <Choice label="공간 선호" values={choices.indoor} selected={form.indoor} onSelect={(value) => update("indoor", value)} compact />
            <Choice label="이동 거리 선호" values={choices.distance} selected={form.distance} onSelect={(value) => update("distance", value)} compact />
          </div>
          <div className="recommend-budget">
            <Choice label="예산" values={choices.budget} selected={form.budget} onSelect={(value) => update("budget", value)} compact />
          </div>

          <p className="weather-auto-note">{form.region === "전국" ? "전국 비교에서는 선택한 실내·야외 취향을 우선 반영합니다. 시·도를 선택하면 해당 지역의 방문일 예보까지 자동으로 반영해요." : "방문 날짜의 예보를 자동 확인해 비·눈 가능성이 높으면 실내 장소의 추천 순위를 올립니다."}</p>
          <button className="recommend-submit" onClick={() => void recommend()} disabled={loading}>
            {loading ? `${scopeLabel} 장소와 날씨를 함께 분석하는 중...` : `${scopeLabel} ${modeLabel(form.mode)} 받기 →`}
          </button>
        </section>
      )}

      {step === "results" && visiblePlaces.length > 0 && (
        <section className="recommend-results">
          <div className="result-heading">
            <div>
              <p className="recommend-eyebrow">YOUR PERSONAL {form.mode === "course" ? "COURSE" : "PICKS"}</p>
              <h2>{form.date} · {scopeLabel} {form.relationship} {modeLabel(form.mode)}</h2>
              <p className="result-profile">{profileSummary} 성향을 반영했어요.</p>
              <p className="result-profile">장소 원천: 한국관광공사 TourAPI · 지도 확인: 네이버 지도 외부 링크</p>
            </div>
            <div className="result-controls">
              {form.mode === "course" && form.region !== "전국" && <><button type="button" onClick={() => saveItinerary()}>코스 저장</button><button type="button" onClick={() => void shareItinerary()} disabled={sharing}>{sharing ? "링크 만드는 중..." : "공유 링크 만들기"}</button></>}
              {form.mode === "course" && form.region === "전국" && <button type="button" onClick={refreshNationwideCourses} disabled={loading}>{loading ? "새 코스 찾는 중..." : "다른 전국 코스"}</button>}
              <button type="button" onClick={() => setStep("situation")}>조건 수정</button>
            </div>
          </div>

          {latestShare && (
            <div className="course-share-receipt">
              <div><small>개인정보를 제외한 공개 링크</small><strong>{latestShare.title}</strong><span>{latestShare.url}</span></div>
              <div><button type="button" onClick={() => void sendLatestShare()}>카카오톡으로 보내기</button><button type="button" onClick={() => void copyShareLink(latestShare.url)}>링크 복사</button><button type="button" onClick={() => void revokeShare(latestShare.id)}>공유 취소</button></div>
            </div>
          )}

          {weather && (
            <div className={`course-weather ${weather.indoorRecommended ? "is-indoor" : "is-outdoor"}`}>
              <div><small>방문일 예보</small><strong>{weather.condition} · 강수 {weather.precipitationProbability}%</strong></div>
              <span>{weather.minTemperature}° ~ {weather.maxTemperature}° · {weather.indoorRecommended ? "실내 장소 비중을 높였어요" : "야외 장소를 함께 추천했어요"}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo.com</a></span>
            </div>
          )}

          {form.mode === "course" ? (
            <div className={`course-collection ${visibleCourses.length > 1 ? "is-nationwide" : ""}`}>
              {visibleCourses.map((course) => (
                <section className="course-bundle" key={course.id}>
                  {visibleCourses.length > 1 && (
                    <div className="course-bundle-heading">
                      <div><span>{course.region}</span><h3>{course.title}</h3><p>{course.items.length}곳을 이동하기 좋은 순서로 묶었어요.</p></div>
                      <div><button type="button" onClick={() => saveItinerary(course)}>이 코스 저장</button><button type="button" onClick={() => void shareItinerary(course)} disabled={sharing}>{sharing ? "준비 중..." : "공유 링크 만들기"}</button></div>
                    </div>
                  )}
                  <div className="place-grid is-list-mode is-course-mode">
                    {course.items.map((place, index) => (
                      <PlaceCard key={`${course.id}-${place.id}-${index}`} place={place} index={index} duration={course.duration} selected={selected} onSave={savePlace} voteUrl={voteUrl} showCourseTime />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="place-grid is-list-mode">
              {visiblePlaces.map((place, index) => (
                <PlaceCard key={`${place.id}-${index}`} place={place} index={index} duration={form.duration} selected={selected} onSave={savePlace} voteUrl={voteUrl} />
              ))}
            </div>
          )}
          {form.mode === "course" && <p className="course-route-note">각 코스에 표시된 순서는 좌표와 주소가 가까운 후보를 우선 배치한 권장 순서입니다. 서로 다른 지역의 코스를 하나의 이동 경로로 연결하지 않으며, 실제 이동시간과 영업 여부는 지도·매장 정보를 다시 확인해 주세요.</p>}
        </section>
      )}

      {savedItineraries.length > 0 && (
        <section className="saved-itinerary-section">
          <div className="saved-itinerary-heading"><div><p className="recommend-eyebrow">SAVED COURSES</p><h2>이 기기에 저장한 코스</h2></div><span>최대 8개까지 보관</span></div>
          <div className="saved-itinerary-list">
            {savedItineraries.map((itinerary) => (
              <article key={itinerary.id}>
                <div><small>{new Date(itinerary.savedAt).toLocaleDateString("ko-KR")} 저장</small><strong>{itinerary.title}</strong><span>{itinerary.places.map((place) => place.name).join(" → ")}</span></div>
                <button type="button" onClick={() => deleteItinerary(itinerary.id)}>삭제</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeShares.length > 0 && (
        <section className="active-share-section">
          <div className="saved-itinerary-heading"><div><p className="recommend-eyebrow">ACTIVE SHARE LINKS</p><h2>내 공유 링크 관리</h2></div><span>계정·닉네임·방문일·메모는 공유되지 않아요</span></div>
          <div className="active-share-list">
            {activeShares.map((share) => (
              <article key={share.id}>
                <div><strong>{share.title}</strong><small>{new Date(share.expiresAt).toLocaleDateString("ko-KR")} 자동 만료</small></div>
                <button type="button" onClick={() => void revokeShare(share.id)}>공유 취소</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function PlaceCard({ place, index, duration, selected, onSave, voteUrl, showCourseTime = false }: { place: Place; index: number; duration: string; selected: string | null; onSave: (place: Place) => void; voteUrl: (place: Place) => string; showCourseTime?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(
    place.imageUrl &&
      place.imageAttribution &&
      (place.imageCopyrightCode === "Type1" || place.imageCopyrightCode === "Type3") &&
      !imageFailed
  );

  return (
    <article className={`place-card ${selected === place.id ? "is-selected" : ""}`}>
      <div className="place-rank">{String(index + 1).padStart(2, "0")}</div>
      {showCourseTime && <div className="course-time">{courseTime(index, duration)}</div>}
      {showImage && (
        <div className="place-card-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={place.imageModificationAllowed ? "" : "is-no-derivatives"}
            src={place.imageUrl ?? ""}
            alt={`${place.name} 대표 사진`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
          <span>{place.imageAttribution}</span>
        </div>
      )}
      <div className="place-score">취향 적합도 {place.score}%</div>
      <h3>{place.name}</h3>
      <p className="place-category">{place.category}</p>
      <p className="place-address">{place.address}</p>
      <p className="place-reason">{place.reason}</p>
      {place.description && <p className="place-description">{place.description}</p>}
      <div className="place-actions">
        <button onClick={() => onSave(place)}>{selected === place.id ? "저장 완료 ✓" : "장소 저장"}</button>
        <a href={place.mapUrl} target="_blank" rel="noreferrer">지도에서 보기</a>
        <a href={voteUrl(place)}>함께 투표 후보로</a>
      </div>
    </article>
  );
}

function Choice({ label, values, selected, onSelect, compact = false, labels = {} }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void; compact?: boolean; labels?: Record<string, string> }) {
  return (
    <div className={`choice-group ${compact ? "is-compact" : ""}`}>
      <span>{label}</span>
      <div className="choice-list">
        {values.map((value) => (
          <button type="button" className={selected === value ? "is-active" : ""} onClick={() => onSelect(value)} key={value}>{labels[value] || value}</button>
        ))}
      </div>
    </div>
  );
}
