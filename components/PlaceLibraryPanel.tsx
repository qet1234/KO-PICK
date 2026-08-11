"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearRecentPlaces,
  libraryPlaceKey,
  loadPlaceLibrary,
  toggleSavedPlace,
  type LibraryPlace,
  type PlaceLibrary,
} from "@/utils/place-library";
import { createPlacePoll } from "@/utils/place-polls";
import { naverMapSearchUrl } from "@/utils/naver-maps";
import { getCurrentUser } from "@/utils/spring-api";

const emptyLibrary: PlaceLibrary = { saved: [], recent: [] };

export default function PlaceLibraryPanel() {
  const [library, setLibrary] = useState<PlaceLibrary>(emptyLibrary);
  const [tab, setTab] = useState<"saved" | "recent">("saved");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("우리 어디 갈까?");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const refresh = async () => {
    setLibrary(await loadPlaceLibrary());
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void getCurrentUser().then(async (user) => {
      if (!active) return;
      const signedIn = Boolean(user);
      setAuthenticated(signedIn);
      if (signedIn) setLibrary(await loadPlaceLibrary());
      if (active) setLoading(false);
    }).catch(() => {
      if (active) {
        setAuthenticated(false);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const visiblePlaces = tab === "saved" ? library.saved : library.recent;
  const availableCandidates = useMemo(() => {
    const byKey = new Map<string, LibraryPlace>();
    [...library.saved, ...library.recent].forEach((place) => byKey.set(libraryPlaceKey(place), place));
    return byKey;
  }, [library]);

  const toggleCandidate = (place: LibraryPlace) => {
    const key = libraryPlaceKey(place);
    setNotice("");
    setSelected((current) => {
      if (current.includes(key)) return current.filter((value) => value !== key);
      if (current.length >= 5) {
        setNotice("후보는 최대 5곳까지 선택할 수 있습니다.");
        return current;
      }
      return [...current, key];
    });
  };

  const removeSaved = async (place: LibraryPlace) => {
    await toggleSavedPlace({
      id: place.sourceId,
      name: place.placeName,
      category: place.category,
      region: place.region,
      city: place.city,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      imageUrl: place.imageUrl,
      source: place.source,
    });
    setSelected((current) => current.filter((key) => key !== libraryPlaceKey(place)));
    await refresh();
  };

  const makePoll = async () => {
    const candidates = selected
      .map((key) => availableCandidates.get(key))
      .filter((place): place is LibraryPlace => Boolean(place));
    if (candidates.length < 2) {
      setNotice("함께 고를 장소를 2곳 이상 선택해 주세요.");
      return;
    }
    setWorking(true);
    setNotice("");
    try {
      const result = await createPlacePoll(title.trim(), candidates);
      const shareUrl = `${window.location.origin}/choose/${result.token}`;
      const shareText = `${title.trim()} 장소 투표에 참여해 주세요.`;
      if (navigator.share) {
        await navigator.share({ title: title.trim(), text: shareText, url: shareUrl });
        setNotice("공유 화면을 열었습니다. 카카오톡을 선택해 링크를 보내세요.");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setNotice("투표 링크를 복사했습니다.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "함께 고르기를 만들지 못했습니다.");
    } finally {
      setWorking(false);
    }
  };

  if (authenticated === false) {
    return (
      <main className="saved-page">
        <header className="saved-header">
          <a href="/">오늘어디</a>
          <div><small>MY PLACE LIBRARY</small><h1>저장한 장소</h1></div>
          <a href="/explore">장소 찾기</a>
        </header>
        <section className="saved-login-gate">
          <span aria-hidden="true">♡</span>
          <small>MEMBER LIBRARY</small>
          <h2>로그인하고 장소를 저장하세요</h2>
          <p>찜한 장소와 최근 본 기록을 계정에 안전하게 저장하고 다른 기기에서도 이어서 확인할 수 있습니다.</p>
          <a href="/login?next=/saved">로그인 / 회원가입</a>
          <a className="saved-guest-link" href="/explore">로그인 없이 장소 둘러보기 →</a>
        </section>
      </main>
    );
  }

  return (
    <main className="saved-page">
      <header className="saved-header">
        <a href="/">오늘어디</a>
        <div><small>MY PLACE LIBRARY</small><h1>저장한 장소</h1></div>
        <a href="/explore">장소 찾기</a>
      </header>

      <div className="saved-layout">
        <section className="saved-list-section">
          <div className="saved-tabs" role="tablist" aria-label="장소 보관함">
            <button type="button" role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "is-active" : ""} onClick={() => setTab("saved")}>
              찜한 장소 <b>{library.saved.length}</b>
            </button>
            <button type="button" role="tab" aria-selected={tab === "recent"} className={tab === "recent" ? "is-active" : ""} onClick={() => setTab("recent")}>
              최근 본 장소 <b>{library.recent.length}</b>
            </button>
          </div>

          {tab === "recent" && library.recent.length > 0 && (
            <button className="saved-clear-recent" type="button" onClick={async () => { await clearRecentPlaces(); await refresh(); }}>
              최근 기록 전체 삭제
            </button>
          )}

          {loading ? (
            <p className="saved-state">장소를 불러오는 중입니다.</p>
          ) : visiblePlaces.length === 0 ? (
            <div className="saved-empty"><strong>{tab === "saved" ? "아직 찜한 장소가 없습니다." : "최근 본 장소가 없습니다."}</strong><a href="/explore">장소 찾아보기 →</a></div>
          ) : (
            <div className="saved-grid">
              {visiblePlaces.map((place) => {
                const key = libraryPlaceKey(place);
                const checked = selected.includes(key);
                return (
                  <article className={`saved-card${checked ? " is-selected" : ""}`} key={key}>
                    <button className="saved-select" type="button" aria-pressed={checked} onClick={() => toggleCandidate(place)}>
                      <span aria-hidden="true">{checked ? "✓" : "+"}</span>{checked ? "후보 선택됨" : "함께 고르기 후보"}
                    </button>
                    <div className="saved-card-copy">
                      <small>{place.category}</small>
                      <h2>{place.placeName}</h2>
                      <p>{place.address ?? [place.region, place.city].filter(Boolean).join(" ")}</p>
                    </div>
                    <div className="saved-card-actions">
                      <a href={naverMapSearchUrl(place.placeName, place.address, place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">네이버 지도 ↗</a>
                      {tab === "saved" && <button type="button" onClick={() => void removeSaved(place)}>찜 해제</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="saved-poll-builder">
          <small>CHOOSE TOGETHER</small>
          <h2>함께 고르기</h2>
          <p>장소 2~5곳을 선택해 링크로 보내세요. 상대방은 앱 설치나 가입 없이 이름만 입력하고 투표할 수 있습니다.</p>
          <label><span>투표 제목</span><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="saved-poll-count"><strong>{selected.length}</strong><span>/ 5곳 선택</span></div>
          <button className="saved-create-poll" type="button" disabled={working || selected.length < 2 || !title.trim()} onClick={() => void makePoll()}>
            {working ? "링크 만드는 중" : "투표 링크 만들기"}
          </button>
          <small className="saved-poll-note">투표 만들기는 로그인이 필요하며, 공유 링크는 14일 동안 사용할 수 있습니다.</small>
          {notice && <p className="saved-notice" aria-live="polite">{notice}</p>}
        </aside>
      </div>
    </main>
  );
}
