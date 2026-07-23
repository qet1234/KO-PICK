"use client";

import { useMemo, useState } from "react";
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
  region: string;
  relationship: string;
  when: string;
  category: string;
  mood: string;
  indoor: string;
  distance: string;
  budget: string;
};

const initialForm: FormState = {
  region: "수원 인계동",
  relationship: "커플",
  when: "오늘 저녁",
  category: "카페",
  mood: "조용한",
  indoor: "실내",
  distance: "3km",
  budget: "보통",
};

const choices = {
  relationship: ["개인", "커플", "친구", "가족"],
  when: ["지금", "오늘 저녁", "주말"],
  category: ["맛집", "카페", "축제", "관광지"],
  mood: ["조용한", "활기찬", "감성적인", "뷰가 좋은"],
  indoor: ["실내", "야외"],
  distance: ["1km", "3km", "5km", "10km"],
  budget: ["낮음", "보통", "높음"],
} as const;

export default function RecommendPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const visiblePlaces = useMemo(() => {
    if (!places.length) return [];
    return Array.from({ length: Math.min(3, places.length) }, (_, index) => places[(offset + index) % places.length]);
  }, [places, offset]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const recommend = async () => {
    setLoading(true);
    setError("");
    setSelected(null);
    setOffset(0);

    try {
      const query = new URLSearchParams(form);
      const response = await fetch(`/api/recommend?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "추천 장소를 불러오지 못했습니다.");
      setPlaces(data.items || []);
      if (!data.items?.length) setError("조건에 맞는 장소를 찾지 못했습니다. 지역이나 카테고리를 바꿔보세요.");
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

  return (
    <main className="recommend-page">
      <header className="recommend-header">
        <a href="/" className="recommend-brand"><span>K</span>코리아픽</a>
        <a href="/explore" className="recommend-explore-link">직접 찾아보기</a>
      </header>

      <section className="recommend-hero">
        <p className="recommend-eyebrow">KO-PICK AUTO CURATION</p>
        <h1>오늘 어디 갈까?</h1>
        <p>검색하지 않아도 누구와, 언제, 어떤 기분인지 알려주면 지금 갈 만한 장소 3곳을 골라드려요.</p>
      </section>

      <section className="recommend-builder">
        <label className="region-field">
          <span>어디에서 찾을까요?</span>
          <input value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="예: 수원 인계동" />
        </label>

        <Choice label="누구와 가나요?" values={choices.relationship} selected={form.relationship} onSelect={(value) => update("relationship", value)} />
        <Choice label="언제 가나요?" values={choices.when} selected={form.when} onSelect={(value) => update("when", value)} />
        <Choice label="무엇을 하고 싶나요?" values={choices.category} selected={form.category} onSelect={(value) => update("category", value)} />
        <Choice label="어떤 분위기가 좋나요?" values={choices.mood} selected={form.mood} onSelect={(value) => update("mood", value)} />

        <div className="recommend-row">
          <Choice label="공간" values={choices.indoor} selected={form.indoor} onSelect={(value) => update("indoor", value)} compact />
          <Choice label="이동 거리" values={choices.distance} selected={form.distance} onSelect={(value) => update("distance", value)} compact />
          <Choice label="예산" values={choices.budget} selected={form.budget} onSelect={(value) => update("budget", value)} compact />
        </div>

        <button className="recommend-submit" onClick={recommend} disabled={loading}>
          {loading ? "지금 갈 곳을 찾는 중..." : "장소 3곳 추천받기 →"}
        </button>
        {error && <p className="recommend-error">{error}</p>}
      </section>

      {visiblePlaces.length > 0 && (
        <section className="recommend-results">
          <div className="result-heading">
            <div>
              <p className="recommend-eyebrow">YOUR TOP 3</p>
              <h2>{form.relationship}과 {form.when}에 가기 좋은 {form.indoor} {form.category} 3곳</h2>
            </div>
            <button onClick={() => setOffset((value) => (value + 3) % places.length)}>다른 곳 추천 ↻</button>
          </div>

          <div className="place-grid">
            {visiblePlaces.map((place, index) => (
              <article className={`place-card ${selected === place.id ? "is-selected" : ""}`} key={`${place.id}-${index}`}>
                <div className="place-rank">0{index + 1}</div>
                <div className="place-score">추천 적합도 {place.score}%</div>
                <h3>{place.name}</h3>
                <p className="place-category">{place.category}</p>
                <p className="place-address">{place.address}</p>
                <p className="place-reason">{place.reason}</p>
                {place.description && <p className="place-description">{place.description}</p>}
                <div className="place-actions">
                  <button onClick={() => savePlace(place)}>{selected === place.id ? "저장 완료 ✓" : "여기로 결정"}</button>
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
