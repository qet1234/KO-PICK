"use client";

import { useEffect, useMemo, useState } from "react";
import NaverBookingButton from "@/components/NaverBookingButton";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";
import { naverMapSearchUrl } from "@/utils/naver-maps";
import { springApiUrl, tourPlacesApiUrl } from "@/utils/spring-api";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";

type CategoryValue = "전체" | "음식" | "카페" | "축제" | "관광지";
type CoupleType = "전체" | "카페" | "데이트 관광지" | "축제" | "음식";

type Place = {
  id: string | number;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  imageUrl?: string | null;
  imageCopyrightCode?: "Type1" | "Type3" | null;
  imageAttribution?: string | null;
  imageModificationAllowed?: boolean;
};

type SubregionOption = {
  code: string;
  name: string;
};

type ActivityPlace = {
  id?: string | number;
  title?: string;
  location?: string;
  popularityScore?: number;
  source?: string;
};

type TypePreset = {
  label: CoupleType;
  category: CategoryValue;
  details: string[];
  description: string;
};

const regionNames = [
  "전국", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

type RegionName = (typeof regionNames)[number];

const typePresets: TypePreset[] = [
  {
    label: "전체",
    category: "전체",
    details: [],
    description: "카페·관광지·축제·음식을 한 번에 비교",
  },
  {
    label: "카페",
    category: "카페",
    details: ["감성카페", "뷰카페", "이색카페"],
    description: "감성·전망·이색 공간 중심",
  },
  {
    label: "데이트 관광지",
    category: "관광지",
    details: ["공원", "미술관·전시관", "테마파크", "자연명소"],
    description: "산책·전시·체험·자연 명소 중심",
  },
  {
    label: "축제",
    category: "축제",
    details: [],
    description: "지역·계절·문화 행사를 확인",
  },
  {
    label: "음식",
    category: "음식",
    details: ["한식", "양식", "일식", "세계음식"],
    description: "데이트 식사 후보를 폭넓게 비교",
  },
];

const PAGE_SIZE = 24;
const SAVED_KEY = "kopick-saved-places";

function normalize(value: unknown) {
  return String(value ?? "").replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function initialType(category: CategoryValue): CoupleType {
  if (category === "관광지") return "데이트 관광지";
  if (category === "카페" || category === "축제" || category === "음식") return category;
  return "전체";
}

function licensedImage(place: Place) {
  return Boolean(
    place.imageUrl &&
      place.imageAttribution &&
      (place.imageCopyrightCode === "Type1" || place.imageCopyrightCode === "Type3"),
  );
}

function activityScore(place: Place, activities: ActivityPlace[]) {
  const id = String(place.id);
  const name = normalize(place.name);
  const address = normalize(place.address);

  let best = 0;
  for (const activity of activities) {
    if (activity.source === "fallback") continue;
    const score = Number(activity.popularityScore ?? 0);
    if (String(activity.id ?? "") === id) {
      best = Math.max(best, score);
      continue;
    }
    const sameName = normalize(activity.title) === name;
    const location = normalize(activity.location);
    if (sameName && (!location || address.includes(location) || location.includes(normalize(place.region)))) {
      best = Math.max(best, score);
    }
  }
  return best;
}

export default function CoupleSafeExplorePage({
  initialCategory,
}: {
  initialCategory: CategoryValue;
  initialDetail?: string;
}) {
  const [selectedType, setSelectedType] = useState<CoupleType>(() => initialType(initialCategory));
  const [selectedRegion, setSelectedRegion] = useState<RegionName>("전국");
  const [selectedDistrict, setSelectedDistrict] = useState("전체");
  const [subregions, setSubregions] = useState<SubregionOption[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activities, setActivities] = useState<ActivityPlace[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const activePreset = useMemo(
    () => typePresets.find((preset) => preset.label === selectedType) ?? typePresets[0],
    [selectedType],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") as Array<{ id?: string | number }>;
      setSavedIds(new Set(saved.map((item) => String(item.id ?? "")).filter(Boolean)));
    } catch {
      localStorage.removeItem(SAVED_KEY);
    }
  }, []);

  useEffect(() => {
    if (!springApiUrl) return;
    const controller = new AbortController();
    void fetch(`${springApiUrl}/api/public/trending-places`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!controller.signal.aborted && Array.isArray(payload?.places)) {
          setActivities(payload.places as ActivityPlace[]);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedRegion === "전국") {
      setSubregions([]);
      setSelectedDistrict("전체");
      return;
    }

    const controller = new AbortController();
    void fetch(`${tourPlacesApiUrl}?mode=subregions&region=${encodeURIComponent(selectedRegion)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted) return;
        const serverItems = Array.isArray(payload?.subregions)
          ? (payload.subregions as SubregionOption[])
          : [];
        if (serverItems.length > 0) {
          setSubregions(serverItems);
          return;
        }
        setSubregions((koreaRegionDistricts[selectedRegion] ?? []).map((name) => ({ code: "", name })));
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSubregions((koreaRegionDistricts[selectedRegion] ?? []).map((name) => ({ code: "", name })));
        }
      });
    return () => controller.abort();
  }, [selectedRegion]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setNotice("");

      const selectedOption = subregions.find((option) => option.name === selectedDistrict);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        region: selectedRegion,
        category: activePreset.category,
      });
      activePreset.details.forEach((detail) => params.append("detailType", detail));
      if (selectedOption?.code) params.set("sigunguCode", selectedOption.code);

      try {
        const response = await fetch(`${tourPlacesApiUrl}?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "장소를 불러오지 못했습니다.");

        let received = (Array.isArray(payload.places) ? payload.places : []) as Place[];
        if (selectedDistrict !== "전체" && !selectedOption?.code) {
          const target = normalize(selectedDistrict);
          received = received.filter((place) =>
            [place.city, place.address].some((value) => normalize(value).includes(target)),
          );
        }

        if (!controller.signal.aborted) {
          setPlaces(received);
          setTotalCount(
            selectedDistrict !== "전체" && !selectedOption?.code
              ? received.length
              : Number(payload.pagination?.totalCount ?? received.length),
          );
          setTotalPages(
            selectedDistrict !== "전체" && !selectedOption?.code
              ? 1
              : Math.max(1, Number(payload.pagination?.totalPages ?? 1)),
          );
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setPlaces([]);
          setTotalCount(0);
          setTotalPages(1);
          setError(loadError instanceof Error ? loadError.message : "장소를 불러오지 못했습니다.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [activePreset, page, selectedDistrict, selectedRegion, subregions]);

  const rankedPlaces = useMemo(
    () => [...places].sort((left, right) => {
      const scoreDifference = activityScore(right, activities) - activityScore(left, activities);
      if (scoreDifference !== 0) return scoreDifference;
      return left.name.localeCompare(right.name, "ko");
    }),
    [activities, places],
  );

  const savePlace = (place: Place) => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]") as Place[];
      const next = saved.some((item) => String(item.id) === String(place.id))
        ? saved
        : [place, ...saved].slice(0, 100);
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setSavedIds((current) => new Set(current).add(String(place.id)));
      setNotice("이 장소를 저장했습니다. 저장·상세보기·외부 지도 반응은 KO-PICK 자체 관심도에 반영됩니다.");
      void trackPlaceActivity(place, "favorite");
    } catch {
      setNotice("장소를 저장하지 못했습니다.");
    }
  };

  return (
    <main className="kp-couple-safe-page">
      <header className="kp-couple-safe-header">
        <a href="/" className="kp-couple-safe-brand"><span>K</span><strong>코리아픽</strong></a>
        <div><small>COUPLE PLACE DISCOVERY</small><strong>커플 장소 찾기</strong></div>
        <a href="/" className="kp-couple-safe-home">홈으로</a>
      </header>

      <section className="kp-couple-safe-hero">
        <div>
          <p>TOURAPI × KO-PICK ACTIVITY</p>
          <h1>데이트에 어울리는 장소를<br />안전한 데이터로 찾아보세요.</h1>
          <span>
            한국관광공사 공개 장소를 기본으로 보여주고, KO-PICK 이용자의 조회·저장·외부 지도 반응이 확인된 장소만 우선 배치합니다.
          </span>
        </div>
        <aside>
          <strong>순위 안내</strong>
          <p>실제 커플 방문자 수나 네이버 리뷰 순위가 아닙니다.</p>
          <small>외부 서비스의 리뷰 본문·별점·사진·검색 결과는 수집하거나 저장하지 않습니다.</small>
        </aside>
      </section>

      <section className="kp-couple-safe-filters">
        <div className="kp-couple-safe-types" role="group" aria-label="커플 장소 카테고리">
          {typePresets.map((preset) => (
            <button
              type="button"
              key={preset.label}
              className={selectedType === preset.label ? "is-active" : ""}
              aria-pressed={selectedType === preset.label}
              onClick={() => {
                setSelectedType(preset.label);
                setPage(1);
              }}
            >
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>

        <div className="kp-couple-safe-region-row">
          <label>
            <span>시·도</span>
            <select
              value={selectedRegion}
              onChange={(event) => {
                setSelectedRegion(event.target.value as RegionName);
                setSelectedDistrict("전체");
                setPage(1);
              }}
            >
              {regionNames.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </label>
          <label>
            <span>시·군·구</span>
            <select
              value={selectedDistrict}
              disabled={selectedRegion === "전국"}
              onChange={(event) => {
                setSelectedDistrict(event.target.value);
                setPage(1);
              }}
            >
              <option value="전체">전체</option>
              {subregions.map((subregion) => (
                <option key={`${subregion.code}-${subregion.name}`} value={subregion.name}>{subregion.name}</option>
              ))}
            </select>
          </label>
          <div className="kp-couple-safe-summary" aria-live="polite">
            {loading ? "데이트 장소를 불러오는 중입니다." : error || `${selectedRegion}${selectedDistrict !== "전체" ? ` · ${selectedDistrict}` : ""} · ${selectedType} ${totalCount.toLocaleString("ko-KR")}곳`}
          </div>
        </div>
      </section>

      {notice && <p className="kp-couple-safe-notice">{notice}</p>}
      {!loading && error && <p className="kp-couple-safe-error">장소 조회 오류: {error}</p>}
      {!loading && !error && rankedPlaces.length === 0 && (
        <p className="kp-couple-safe-empty">선택한 조건의 장소가 없습니다. 지역이나 카테고리를 바꿔보세요.</p>
      )}

      {!loading && !error && rankedPlaces.length > 0 && (
        <section className="kp-couple-safe-grid" aria-label="커플 장소 결과">
          {rankedPlaces.map((place, index) => {
            const score = activityScore(place, activities);
            const saved = savedIds.has(String(place.id));
            return (
              <article className="kp-couple-safe-card" key={place.id}>
                <div className="kp-couple-safe-media">
                  {licensedImage(place) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={place.imageModificationAllowed ? "" : "is-no-derivatives"}
                      src={place.imageUrl ?? ""}
                      alt={`${place.name} 대표 사진`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="kp-couple-safe-placeholder"><b>{selectedType === "전체" ? place.category : selectedType}</b><span>공공데이터 장소</span></div>
                  )}
                  <span className="kp-couple-safe-rank">{String(index + 1).padStart(2, "0")}</span>
                  {score > 0 && <strong className="kp-couple-safe-activity">KO-PICK 관심 반응</strong>}
                  {place.imageAttribution && licensedImage(place) && <small>{place.imageAttribution}</small>}
                </div>
                <div className="kp-couple-safe-copy">
                  <span>{[place.region, place.city].filter(Boolean).join(" · ")} · {place.category}</span>
                  <h2>{place.name}</h2>
                  <p>{place.address || "주소 정보가 없습니다."}</p>
                </div>
                <div className="kp-couple-safe-actions">
                  <button type="button" className={saved ? "is-saved" : ""} onClick={() => savePlace(place)} disabled={saved}>
                    {saved ? "저장 완료 ✓" : "장소 저장"}
                  </button>
                  <a
                    href={naverMapSearchUrl(place.name, place.address, place.latitude, place.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => void trackPlaceActivity(place, "outbound")}
                  >
                    네이버 지도에서 확인 ↗
                  </a>
                  <NaverBookingButton
                    name={place.name}
                    address={place.address}
                    category={place.category}
                    source="tour"
                    compact
                    onClick={() => void trackPlaceActivity(place, "outbound")}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && totalPages > 1 && (
        <nav className="kp-couple-safe-pagination" aria-label="장소 결과 페이지">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>이전</button>
          <span><strong>{page}</strong> / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>다음</button>
        </nav>
      )}

      <footer className="kp-couple-safe-source">
        <strong>데이터 및 순위 기준</strong>
        <span>장소·허용된 대표 이미지: 한국관광공사 TourAPI</span>
        <span>우선 배치: KO-PICK 내 익명화된 조회·저장·외부 이동 반응</span>
        <span>지도·예약 확인: 네이버 외부 페이지 연결</span>
        <small>네이버 지역 검색 결과를 수집·결합·점수화·캐시하지 않습니다.</small>
      </footer>
    </main>
  );
}
