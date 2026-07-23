"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type FormState = {
  scope: string;
  resultCount: string;
  region: string;
  relationship: string;
  when: string;
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

const initialForm: FormState = {
  scope: "내 지역",
  resultCount: "12곳",
  region: "수원 인계동",
  relationship: "커플",
  when: "오늘 저녁",
  category: "카페",
  mood: "조용한",
  indoor: "실내",
  distance: "3km",
  budget: "보통",
};

const initialPreferences: PreferenceState = {
  pace: "여유롭게",
  crowd: "한적한 곳",
  discovery: "검증된 인기 장소",
  activity: "휴식 중심",
  foodStyle: "익숙한 취향",
};

const choices = {
  scope: ["내 지역", "전국"],
  resultCount: ["3곳", "12곳", "24곳", "48곳"],
  relationship: ["개인", "커플", "친구", "가족"],
  when: ["지금", "오늘 저녁", "주말"],
  category: ["맛집", "카페", "축제", "관광지"],
  mood: ["조용한", "활기찬", "감성적인", "뷰가 좋은"],
  indoor: ["실내", "야외"],
  distance: ["1km", "3km", "5km", "10km"],
  budget: ["낮음", "보통", "높음"],
} as const;

const preferenceChoices = {
  pace: ["여유롭게", "알차게"],
  crowd: ["한적한 곳", "사람 많은 곳"],
  discovery: ["검증된 인기 장소", "새로운 숨은 장소"],
  activity: ["휴식 중심", "체험 중심"],
  foodStyle: ["익숙한 취향", "새로운 맛 도전"],
} as const;

const PREFERENCE_KEY = "kopick-recommend-preferences";

export default function RecommendPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [preferences, setPreferences] = useState<PreferenceState>(initialPreferences);
  const [step, setStep] = useState<"preferences" | "situation" | "results">("preferences");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFERENCE_KEY);
      if (saved) {
        setPreferences({ ...initialPreferences, ...(JSON.parse(saved) as Partial<PreferenceState>) });
        setStep("situation");
      }
    } catch {
      localStorage.removeItem(PREFERENCE_KEY);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  const requestedCount = Number.parseInt(form.resultCount, 10) || 12;
  const visiblePlaces = useMemo(() => {
    if (!places.length) return [];
    if (requestedCount === 3) {
      return Array.from({ length: Math.min(3, places.length) }, (_, index) => places[(offset + index) % places.length]);
    }
    return places.slice(0, requestedCount);
  }, [places, offset, requestedCount]);

  const profileSummary = useMemo(() => Object.values(preferences).join(" · "), [preferences]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePreference = (key: keyof PreferenceState, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const savePreferences = () => {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    setStep("situation");
  };

  const recommend = async () => {
    setLoading(true);
    setError("");
    setSelected(null);
    setOffset(0);

    try {
      localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
      const query = new URLSearchParams({ ...form, ...preferences });
      const response = await fetch(`/api/recommend?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "추천 장소를 불러오지 못했습니다.");
      setPlaces(data.items || []);
      if (!data.items?.length) {
        setError("조건에 맞는 장소를 찾지 못했습니다. 지역이나 카테고리를 바꿔보세요.");
        return;
      }
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 중 오류가 발생했습니다.");
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
  };

  if (!profileLoaded) return null;

  const scopeLabel = form.scope === "전국" ? "전국" : form.region;

  return (
    <main className="recommend-page">
      <header className="recommend-header">
        <a href="/" className="recommend-brand"><span>K</span>코리아픽</a>
        <a href="/explore" className="recommend-explore-link">직접 찾아보기</a>
      </header>

      <section className="recommend-hero">
        <p className="recommend-eyebrow">KO-PICK PERSONAL CURATION</p>
        <h1>내 취향에 맞는 전국 장소</h1>
        <p>내 주변의 몇 곳만 추천받거나, 전국의 장소를 성향 적합도순으로 넓게 살펴볼 수 있어요.</p>
      </section>

      <nav className="recommend-steps" aria-label="추천 단계">
        <span className={step === "preferences" ? "is-active" : ""}>1. 내 성향</span>
        <span className={step === "situation" ? "is-active" : ""}>2. 추천 범위</span>
        <span className={step === "results" ? "is-active" : ""}>3. 추천 결과</span>
      </nav>

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
          <button className="recommend-submit" onClick={savePreferences}>이 성향으로 추천 시작하기 →</button>
        </section>
      )}

      {step === "situation" && (
        <section className="recommend-builder">
          <div className="saved-profile">
            <div><small>저장된 내 성향</small><strong>{profileSummary}</strong></div>
            <button type="button" onClick={() => setStep("preferences")}>성향 다시 설정</button>
          </div>

          <Choice label="어느 범위에서 찾을까요?" values={choices.scope} selected={form.scope} onSelect={(value) => update("scope", value)} />
          <Choice label="몇 곳을 확인할까요?" values={choices.resultCount} selected={form.resultCount} onSelect={(value) => update("resultCount", value)} />

          {form.scope === "내 지역" && (
            <label className="region-field">
              <span>어디에서 찾을까요?</span>
              <input value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="예: 수원 인계동" />
            </label>
          )}

          {form.scope === "전국" && (
            <div className="nationwide-notice">
              <strong>전국 균형 추천</strong>
              <p>17개 시·도를 고르게 검색한 뒤 저장된 성향과 오늘 조건에 잘 맞는 장소부터 보여드려요.</p>
            </div>
          )}

          <Choice label="누구와 가나요?" values={choices.relationship} selected={form.relationship} onSelect={(value) => update("relationship", value)} />
          <Choice label="언제 가나요?" values={choices.when} selected={form.when} onSelect={(value) => update("when", value)} />
          <Choice label="무엇을 하고 싶나요?" values={choices.category} selected={form.category} onSelect={(value) => update("category", value)} />
          <Choice label="오늘 원하는 분위기" values={choices.mood} selected={form.mood} onSelect={(value) => update("mood", value)} />

          <div className="recommend-row">
            <Choice label="공간" values={choices.indoor} selected={form.indoor} onSelect={(value) => update("indoor", value)} compact />
            <Choice label="이동 거리" values={choices.distance} selected={form.distance} onSelect={(value) => update("distance", value)} compact />
            <Choice label="예산" values={choices.budget} selected={form.budget} onSelect={(value) => update("budget", value)} compact />
          </div>

          <button className="recommend-submit" onClick={recommend} disabled={loading}>
            {loading ? "전국에서 내 취향에 맞는 장소를 찾는 중..." : `${scopeLabel} 맞춤 장소 ${form.resultCount} 보기 →`}
          </button>
          {error && <p className="recommend-error">{error}</p>}
        </section>
      )}

      {step === "results" && visiblePlaces.length > 0 && (
        <section className="recommend-results">
          <div className="result-heading">
            <div>
              <p className="recommend-eyebrow">YOUR PERSONAL PICKS</p>
              <h2>{scopeLabel}에서 {form.relationship}과 가기 좋은 {form.category} {visiblePlaces.length}곳</h2>
              <p className="result-profile">{profileSummary} 성향을 반영해 적합도순으로 정렬했어요.</p>
            </div>
            <div className="result-controls">
              <button onClick={() => setStep("situation")}>조건 수정</button>
              {requestedCount === 3 && places.length > 3 && (
                <button onClick={() => setOffset((value) => (value + 3) % places.length)}>다른 곳 추천 ↻</button>
              )}
            </div>
          </div>

          <div className={`place-grid ${requestedCount > 3 ? "is-list-mode" : ""}`}>
            {visiblePlaces.map((place, index) => (
              <article className={`place-card ${selected === place.id ? "is-selected" : ""}`} key={`${place.id}-${index}`}>
                <div className="place-rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="place-score">취향 적합도 {place.score}%</div>
                <h3>{place.name}</h3>
                <p className="place-category">{place.category}</p>
                <p className="place-address">{place.address}</p>
                <p className="place-reason">{place.reason}</p>
                {place.description && <p className="place-description">{place.description}</p>}
                <div className="place-actions">
                  <button onClick={() => savePlace(place)}>{selected === place.id ? "저장 완료 ✓" : "저장하기"}</button>
                  <a href={place.mapUrl} target="_blank" rel="noreferrer">지도에서 보기</a>
                  <a href={place.reservationUrl} target="_blank" rel="noreferrer">네이버 예약 확인</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Choice({ label, values, selected, onSelect, compact = false }: { label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void; compact?: boolean }) {
  return (
    <div className={`choice-group ${compact ? "is-compact" : ""}`}>
      <span>{label}</span>
      <div className="choice-list">
        {values.map((value) => (
          <button type="button" className={selected === value ? "is-active" : ""} onClick={() => onSelect(value)} key={value}>{value}</button>
        ))}
      </div>
    </div>
  );
}
