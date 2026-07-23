"use client";

import { useEffect, useMemo, useState } from "react";

type Recommendation = {
  id: string;
  name: string;
  category: string;
  address: string;
  telephone?: string;
  description?: string;
  mapUrl: string;
};

type ApiResponse = {
  region?: string;
  category?: string;
  updatedAt?: string;
  items?: Recommendation[];
  error?: string;
};

const regions = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

const categories = ["전체", "맛집", "카페", "축제", "관광지"] as const;

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "추천 API를 찾지 못했습니다. 최신 화면으로 다시 불러와 주세요."
        : "추천 서버 응답이 올바르지 않습니다. 잠시 후 다시 시도해 주세요."
    );
  }

  try {
    return JSON.parse(raw) as ApiResponse;
  } catch {
    throw new Error("추천 데이터를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export default function NaverRegionRecommendations() {
  const [region, setRegion] = useState<(typeof regions)[number]>("서울");
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          region,
          category,
          t: String(Date.now()),
        });
        const response = await fetch(`/api/region-recommendations?${params.toString()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const payload = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(payload.error || "추천 장소를 불러오지 못했습니다.");
        }

        const nextItems = payload.items || [];
        if (nextItems.length === 0) {
          throw new Error("선택한 조건의 장소를 찾지 못했습니다. 다른 지역이나 카테고리를 선택해 주세요.");
        }

        setItems(nextItems);
        setUpdatedAt(payload.updatedAt ? new Date(payload.updatedAt) : new Date());
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setItems([]);
        setUpdatedAt(null);
        setError(cause instanceof Error ? cause.message : "추천 장소를 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [region, category, retryKey]);

  const mapAllUrl = useMemo(() => {
    const keyword = category === "전체" ? "가볼만한 곳" : category;
    return `https://map.naver.com/p/search/${encodeURIComponent(`${region} ${keyword}`)}`;
  }, [region, category]);

  return (
    <section className="kp-naver-recommendations" aria-labelledby="naver-recommend-title">
      <div className="kp-naver-heading">
        <div>
          <p className="kp-overline">NAVER LOCAL LIVE</p>
          <h2 id="naver-recommend-title">지역별 실시간 추천 리스트</h2>
          <p>네이버 지역 검색 결과를 바탕으로 선택한 지역의 장소를 바로 보여드립니다.</p>
        </div>
        <a href={mapAllUrl} target="_blank" rel="noreferrer">네이버 지도 전체보기 ↗</a>
      </div>

      <div className="kp-naver-controls">
        <label>
          <span>지역</span>
          <select value={region} onChange={(event) => setRegion(event.target.value as typeof region)}>
            {regions.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        <div className="kp-naver-category-filter" aria-label="장소 카테고리">
          {categories.map((value) => (
            <button
              type="button"
              key={value}
              className={category === value ? "is-active" : ""}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="kp-naver-status" aria-live="polite">
        <strong>{region} · {category}</strong>
        <span>{updatedAt ? `${updatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신` : "실시간 연결 중"}</span>
      </div>

      {loading && <div className="kp-naver-state">추천 장소를 불러오는 중입니다.</div>}

      {!loading && error && (
        <div className="kp-naver-state is-error">
          <div className="kp-naver-error-actions">
            <p>{error}</p>
            <div>
              <button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 불러오기</button>
              <a href={mapAllUrl} target="_blank" rel="noreferrer">네이버 지도에서 직접 보기 ↗</a>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="kp-naver-list">
          {items.map((item, index) => (
            <article className="kp-naver-place" key={item.id}>
              <span className="kp-naver-rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="kp-naver-place-body">
                <small>{item.category}</small>
                <h3>{item.name}</h3>
                <p>{item.address}</p>
                {item.telephone && <span>{item.telephone}</span>}
              </div>
              <a href={item.mapUrl} target="_blank" rel="noreferrer" aria-label={`${item.name} 네이버 지도에서 보기`}>
                지도에서 보기 ↗
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
