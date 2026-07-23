"use client";

import { useMemo, useState } from "react";
import { springApiUrl } from "@/utils/spring-api";
import { trackPlaceActivity } from "@/utils/trackPlaceActivity";
import styles from "./SmartRecommendations.module.css";

type Companion = "개인" | "커플" | "친구" | "가족";
type Moment = "지금" | "오늘 저녁" | "주말";
type Category = "전체" | "음식" | "카페" | "축제" | "관광지";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Place = {
  id: number | string;
  name: string;
  region: string;
  city: string | null;
  category: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  imageUrl?: string | null;
};

const companions: Companion[] = ["개인", "커플", "친구", "가족"];
const moments: Moment[] = ["지금", "오늘 저녁", "주말"];
const categories: Category[] = ["전체", "음식", "카페", "축제", "관광지"];

const regionCenters: Record<string, Coordinates> = {
  서울: { latitude: 37.5665, longitude: 126.978 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  울산: { latitude: 35.5384, longitude: 129.3114 },
  세종: { latitude: 36.4801, longitude: 127.289 },
  경기: { latitude: 37.4138, longitude: 127.5183 },
  강원: { latitude: 37.8228, longitude: 128.1555 },
  충북: { latitude: 36.6357, longitude: 127.4917 },
  충남: { latitude: 36.6588, longitude: 126.6728 },
  전북: { latitude: 35.8203, longitude: 127.1088 },
  전남: { latitude: 34.8161, longitude: 126.463 },
  경북: { latitude: 36.576, longitude: 128.5056 },
  경남: { latitude: 35.2383, longitude: 128.6924 },
  제주: { latitude: 33.4996, longitude: 126.5312 },
};

const companionCategoryBonus: Record<Companion, Record<string, number>> = {
  개인: { 카페: 20, 관광지: 16, 음식: 12, 축제: 8 },
  커플: { 카페: 20, 관광지: 19, 축제: 17, 음식: 15 },
  친구: { 축제: 20, 음식: 19, 관광지: 16, 카페: 12 },
  가족: { 관광지: 20, 축제: 18, 음식: 15, 카페: 10 },
};

const momentCategoryBonus: Record<Moment, Record<string, number>> = {
  지금: { 카페: 14, 관광지: 13, 음식: 11, 축제: 9 },
  "오늘 저녁": { 음식: 15, 축제: 13, 카페: 10, 관광지: 8 },
  주말: { 관광지: 15, 축제: 14, 음식: 11, 카페: 10 },
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function nearestRegion(location: Coordinates) {
  return Object.entries(regionCenters).reduce(
    (nearest, [name, center]) => {
      const distance = distanceKm(location, center);
      return distance < nearest.distance ? { name, distance } : nearest;
    },
    { name: "서울", distance: Number.POSITIVE_INFINITY },
  ).name;
}

function coordinatesFor(place: Place): Coordinates | null {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function stableTieBreaker(place: Place, companion: Companion, moment: Moment) {
  const source = `${place.id}:${companion}:${moment}`;
  let value = 0;
  for (let index = 0; index < source.length; index += 1) {
    value = (value * 31 + source.charCodeAt(index)) % 997;
  }
  return value / 997;
}

function scorePlace(
  place: Place,
  location: Coordinates,
  companion: Companion,
  moment: Moment,
) {
  const coordinates = coordinatesFor(place);
  const distance = coordinates ? distanceKm(location, coordinates) : 120;
  const distanceScore = Math.max(0, 50 - distance * 0.9);
  const category = place.category in companionCategoryBonus[companion]
    ? place.category
    : "관광지";

  return (
    distanceScore +
    (companionCategoryBonus[companion][category] ?? 8) +
    (momentCategoryBonus[moment][category] ?? 7) +
    (place.imageUrl ? 4 : 0) +
    stableTieBreaker(place, companion, moment)
  );
}

function currentPosition() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 현재 위치를 사용할 수 없습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => reject(new Error("현재 위치 권한을 허용하면 주변 장소를 추천할 수 있어요.")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

function navigationTarget(place: Place) {
  const coordinates = coordinatesFor(place);
  return {
    name: place.name,
    address: place.address ?? "",
    ...(coordinates ?? {}),
  };
}

export default function SmartRecommendations() {
  const [companion, setCompanion] = useState<Companion>("커플");
  const [moment, setMoment] = useState<Moment>("지금");
  const [category, setCategory] = useState<Category>("전체");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [region, setRegion] = useState("");
  const [pool, setPool] = useState<Place[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const recommendations = useMemo(() => {
    if (pool.length <= 3) return pool;
    return Array.from({ length: 3 }, (_, index) => pool[(offset + index) % pool.length]);
  }, [offset, pool]);

  const requestRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      const nextLocation = location ?? (await currentPosition());
      const nextRegion = nearestRegion(nextLocation);
      const params = new URLSearchParams({
        page: "1",
        pageSize: "100",
        region: nextRegion,
        category,
      });
      const response = await fetch(
        `${springApiUrl}/api/public/tour/places?${params.toString()}`,
      );
      const payload = (await response.json().catch(() => null)) as
        | { places?: Place[]; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "추천 장소를 불러오지 못했습니다.");
      }

      const places = (payload?.places ?? [])
        .filter((place) => coordinatesFor(place))
        .sort(
          (left, right) =>
            scorePlace(right, nextLocation, companion, moment) -
            scorePlace(left, nextLocation, companion, moment),
        );

      if (places.length === 0) {
        throw new Error("선택한 조건에 맞는 장소가 아직 없습니다.");
      }

      setLocation(nextLocation);
      setRegion(nextRegion);
      setPool(places);
      setOffset(0);
      places.slice(0, 3).forEach((place) => {
        void trackPlaceActivity(place, "view");
      });
    } catch (caught) {
      setPool([]);
      setError(caught instanceof Error ? caught.message : "추천을 준비하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const showNext = () => {
    if (pool.length <= 3) return;
    const nextOffset = (offset + 3) % pool.length;
    setOffset(nextOffset);
    Array.from({ length: 3 }, (_, index) => pool[(nextOffset + index) % pool.length]).forEach(
      (place) => void trackPlaceActivity(place, "view"),
    );
  };

  const openNavigation = (place: Place) => {
    void trackPlaceActivity(place, "outbound");
    window.dispatchEvent(
      new CustomEvent("kopick:open-navigation", {
        detail: navigationTarget(place),
      }),
    );
  };

  const openNaver = (place: Place) => {
    void trackPlaceActivity(place, "outbound");
    const query = encodeURIComponent(
      [place.name, place.address].filter(Boolean).join(" "),
    );
    window.open(`https://map.naver.com/p/search/${query}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className={styles.section} id="ai">
      <div className={`kp-container ${styles.panel}`}>
        <div className={styles.intro}>
          <p>SMART PICK · BETA</p>
          <h2>
            검색하지 않아도
            <br />
            지금 갈 곳 3곳
          </h2>
          <span>
            현재 위치는 주변 추천에만 사용하며 서버에 별도로 저장하지 않습니다.
          </span>
        </div>

        <div className={styles.controls}>
          <ChoiceGroup
            label="누구와 가나요?"
            values={companions}
            selected={companion}
            onSelect={setCompanion}
          />
          <ChoiceGroup
            label="언제 가나요?"
            values={moments}
            selected={moment}
            onSelect={setMoment}
          />
          <ChoiceGroup
            label="어디로 갈까요?"
            values={categories}
            selected={category}
            onSelect={setCategory}
          />

          <button
            className={styles.recommendButton}
            type="button"
            disabled={loading}
            onClick={() => void requestRecommendations()}
          >
            {loading ? "내 주변을 찾는 중..." : "현재 위치로 3곳 추천받기 →"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {recommendations.length > 0 && location && (
          <div className={styles.results}>
            <header className={styles.resultHeader}>
              <div>
                <small>{region} 주변 추천</small>
                <strong>
                  {companion}와 {moment}에 가기 좋은 곳을 골랐어요.
                </strong>
              </div>
              <button type="button" onClick={showNext} disabled={pool.length <= 3}>
                다른 3곳 추천
              </button>
            </header>

            <div className={styles.cardGrid}>
              {recommendations.map((place, index) => {
                const placeCoordinates = coordinatesFor(place);
                const distance = placeCoordinates
                  ? distanceKm(location, placeCoordinates)
                  : null;

                return (
                  <article className={styles.card} key={`${place.id}-${index}`}>
                    <div
                      className={styles.image}
                      style={
                        place.imageUrl
                          ? { backgroundImage: `url("${place.imageUrl}")` }
                          : undefined
                      }
                    >
                      <span>0{index + 1}</span>
                      {!place.imageUrl && <strong>{place.category.slice(0, 1)}</strong>}
                    </div>
                    <div className={styles.cardCopy}>
                      <small>{place.category}</small>
                      <h3>{place.name}</h3>
                      <p>{place.address ?? [place.region, place.city].filter(Boolean).join(" ")}</p>
                      <span>
                        {distance !== null ? `${distance.toFixed(1)}km · ` : ""}
                        {companion} · {moment} 조건 반영
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => openNavigation(place)}>
                        여기로 결정
                      </button>
                      <button type="button" onClick={() => openNaver(place)}>
                        네이버에서 확인
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <a
              className={styles.exploreLink}
              href={`/explore?category=${encodeURIComponent(category)}`}
            >
              같은 조건의 장소 더 보기 →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function ChoiceGroup<T extends string>({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>{label}</legend>
      <div>
        {values.map((value) => (
          <button
            type="button"
            key={value}
            className={selected === value ? styles.active : ""}
            aria-pressed={selected === value}
            onClick={() => onSelect(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
