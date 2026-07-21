"use client";

import { useEffect, useState } from "react";
import styles from "./PlaceNavigationChooser.module.css";

type Provider = "kakao" | "naver";

type PlaceTarget = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

const PREFERENCE_KEY = "kopick:preferred-navigation-provider";
const CACHE_KEY = "kopick:tour-place-cache:v2";
const ROUTE_EVENT = "kopick:open-navigation";
const CHANGE_EVENT = "kopick:change-navigation-provider";

function providerLabel(provider: Provider | null) {
  if (provider === "kakao") return "카카오맵";
  if (provider === "naver") return "네이버지도";
  return "선택 안 됨";
}

function readCoordinates(name: string, address: string) {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};

    const entries = JSON.parse(raw) as Array<[string, { body?: string }]>;
    for (const [, cached] of entries) {
      if (!cached.body) continue;
      const payload = JSON.parse(cached.body) as {
        places?: Array<{
          name?: string;
          address?: string | null;
          latitude?: number | string;
          longitude?: number | string;
        }>;
      };

      const match = payload.places?.find(
        (place) =>
          place.name === name &&
          (!address || !place.address || place.address === address),
      );
      if (!match) continue;

      const latitude = Number(match.latitude);
      const longitude = Number(match.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch {
    // 좌표 캐시를 읽지 못해도 장소명·주소 검색으로 계속 진행합니다.
  }

  return {};
}

function providerUrl(provider: Provider, target: PlaceTarget) {
  const query = encodeURIComponent(
    [target.name, target.address].filter(Boolean).join(" "),
  );

  if (
    provider === "kakao" &&
    Number.isFinite(target.latitude) &&
    Number.isFinite(target.longitude)
  ) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(target.name)},${target.latitude},${target.longitude}`;
  }

  if (provider === "kakao") {
    return `https://map.kakao.com/link/search/${query}`;
  }

  return `https://map.naver.com/p/search/${query}`;
}

function openProvider(provider: Provider, target: PlaceTarget) {
  window.open(providerUrl(provider, target), "_blank", "noopener,noreferrer");
}

export default function PlaceNavigationChooser() {
  const [target, setTarget] = useState<PlaceTarget | null>(null);
  const [remember, setRemember] = useState(true);
  const [preferred, setPreferred] = useState<Provider | null>(null);
  const [forceChoice, setForceChoice] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(PREFERENCE_KEY);
    if (stored === "kakao" || stored === "naver") setPreferred(stored);
  }, []);

  useEffect(() => {
    const updateButtons = () => {
      document.querySelectorAll<HTMLButtonElement>(`.${styles.routeButton}`).forEach((button) => {
        button.textContent = preferred
          ? `${providerLabel(preferred)}으로 길찾기`
          : "내 지도로 길찾기";
      });
    };

    updateButtons();
  }, [preferred]);

  useEffect(() => {
    const scanCards = () => {
      document.querySelectorAll<HTMLElement>(".kp-explore-place-card").forEach((card) => {
        if (card.dataset.navigationReady === "true") return;

        const name = card.querySelector("h2")?.textContent?.trim() ?? "";
        const address = card.querySelector(".kp-explore-card-copy p")?.textContent?.trim() ?? "";
        if (!name) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = styles.routeButton;
        button.textContent = preferred
          ? `${providerLabel(preferred)}으로 길찾기`
          : "내 지도로 길찾기";
        button.setAttribute("aria-label", `${name} 길찾기`);
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const coordinates = readCoordinates(name, address);
          window.dispatchEvent(
            new CustomEvent<PlaceTarget>(ROUTE_EVENT, {
              detail: { name, address, ...coordinates },
            }),
          );
        });

        card.appendChild(button);
        card.dataset.navigationReady = "true";
      });
    };

    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<PlaceTarget>).detail;
      const stored = window.localStorage.getItem(PREFERENCE_KEY) as Provider | null;

      if (!forceChoice && (stored === "kakao" || stored === "naver")) {
        openProvider(stored, detail);
        return;
      }

      setForceChoice(false);
      setTarget(detail);
    };

    const onChange = () => {
      setForceChoice(true);
      setTarget({ name: "기본 길찾기 지도 변경", address: "" });
    };

    scanCards();
    const observer = new MutationObserver(scanCards);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener(ROUTE_EVENT, onOpen);
    window.addEventListener(CHANGE_EVENT, onChange);

    return () => {
      observer.disconnect();
      window.removeEventListener(ROUTE_EVENT, onOpen);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, [forceChoice, preferred]);

  useEffect(() => {
    if (!target) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTarget(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target]);

  const choose = (provider: Provider) => {
    if (!target) return;

    if (remember) {
      window.localStorage.setItem(PREFERENCE_KEY, provider);
      setPreferred(provider);
    }

    if (target.name !== "기본 길찾기 지도 변경") {
      openProvider(provider, target);
    }

    setTarget(null);
  };

  const clearPreference = () => {
    window.localStorage.removeItem(PREFERENCE_KEY);
    setPreferred(null);
    setTarget(null);
  };

  return (
    <>
      <div className={styles.preferenceBar} aria-live="polite">
        <span>
          기본 길찾기 지도: <strong>{providerLabel(preferred)}</strong>
        </span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(CHANGE_EVENT))}
        >
          변경
        </button>
      </div>

      {target && (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setTarget(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-dialog-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <small>길찾기 앱 선택</small>
                <h2 id="navigation-dialog-title">어떤 지도로 열까요?</h2>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="닫기"
                onClick={() => setTarget(null)}
              >
                ×
              </button>
            </header>

            {target.name !== "기본 길찾기 지도 변경" && (
              <>
                <p className={styles.placeName}>{target.name}</p>
                <p className={styles.locationNote}>
                  {Number.isFinite(target.latitude) && Number.isFinite(target.longitude)
                    ? "관광공사 좌표를 기준으로 목적지를 엽니다."
                    : "좌표가 없으면 장소명과 주소 검색 결과를 엽니다."}
                </p>
              </>
            )}

            <div className={styles.providerGrid}>
              <button
                className={styles.providerButton}
                type="button"
                onClick={() => choose("kakao")}
              >
                <strong>카카오맵</strong>
                <span>카카오맵에서 목적지를 열고 길을 찾아요.</span>
              </button>
              <button
                className={styles.providerButton}
                type="button"
                onClick={() => choose("naver")}
              >
                <strong>네이버지도</strong>
                <span>네이버지도에서 장소를 확인하고 길을 찾아요.</span>
              </button>
            </div>

            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              다음부터 선택한 지도로 바로 열기
            </label>

            {preferred && (
              <button
                className={styles.resetButton}
                type="button"
                onClick={clearPreference}
              >
                저장된 지도 선택 지우기
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
}
