"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, springJson } from "@/utils/spring-api";

type SpaceType = "personal" | "couple" | "friends" | "family";
type PlanStatus = "voting" | "ready" | "requested" | "confirmed" | "cancelled";

type SpaceSummary = {
  id: string;
  space_type: SpaceType;
  name: string;
  member_count: number;
};

type Candidate = {
  id: string;
  place_name: string;
  place_source: string;
  place_id: string | null;
  category: string | null;
  address: string | null;
  starts_at: string;
  external_reservation_url: string | null;
  is_selected: boolean;
  vote_count: number;
  voted_by_me: boolean;
  voters: Array<{ display_name: string }>;
};

type ReservationPlan = {
  id: string;
  space_id: string;
  space_name: string;
  space_type: SpaceType;
  title: string;
  purpose: string;
  reservation_date: string;
  party_size: number;
  budget_per_person: number | null;
  note: string | null;
  status: PlanStatus;
  can_manage: boolean;
  candidates: Candidate[];
};

const statusInfo: Record<PlanStatus, { label: string; detail: string }> = {
  voting: { label: "함께 고르는 중", detail: "구성원이 장소 후보에 투표하고 있어요." },
  ready: { label: "장소·일정 확정", detail: "공동 달력에 저장됐어요. 실제 예약을 진행해 주세요." },
  requested: { label: "예약 요청 중", detail: "매장 또는 외부 예약 서비스의 답변을 기다리는 상태예요." },
  confirmed: { label: "예약 확정", detail: "매장에서 실제 예약 완료를 확인한 상태예요." },
  cancelled: { label: "계획 취소", detail: "취소된 예약 계획이에요." },
};

const spaceLabels: Record<SpaceType, string> = {
  personal: "개인",
  couple: "커플",
  friends: "친구",
  family: "가족",
};

const purposes = ["데이트", "기념일", "친구 모임", "가족 나들이", "혼자 외출"];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function searchUrl(base: "naver" | "kakao", candidate: Candidate) {
  const query = [candidate.place_name, candidate.address].filter(Boolean).join(" ");
  if (base === "kakao") return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query + " 예약")}`;
}

function toIso(localDateTime: string) {
  const value = new Date(localDateTime);
  if (Number.isNaN(value.getTime())) throw new Error("후보 방문 날짜와 시간을 확인해 주세요.");
  return value.toISOString();
}

export default function ReservationPage() {
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const today = localDateKey();
  const initialPlaceName = searchParams.get("placeName") ?? "";
  const initialAddress = searchParams.get("address") ?? "";
  const initialCategory = searchParams.get("category") ?? "";
  const initialPlaceId = searchParams.get("placeId") ?? "";
  const initialSpaceId = searchParams.get("spaceId") ?? "";

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [plans, setPlans] = useState<ReservationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [spaceId, setSpaceId] = useState("");
  const [title, setTitle] = useState(initialPlaceName ? `${initialPlaceName} 함께 예약` : "우리의 외출 계획");
  const [purpose, setPurpose] = useState("데이트");
  const [reservationDate, setReservationDate] = useState(today);
  const [partySize, setPartySize] = useState(2);
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [placeName, setPlaceName] = useState(initialPlaceName);
  const [address, setAddress] = useState(initialAddress);
  const [category, setCategory] = useState(initialCategory);
  const [candidateStartsAt, setCandidateStartsAt] = useState(`${today}T18:00`);
  const [externalUrl, setExternalUrl] = useState("");

  const [addingToPlan, setAddingToPlan] = useState<string | null>(null);
  const [addPlaceName, setAddPlaceName] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addStartsAt, setAddStartsAt] = useState(`${today}T18:00`);
  const [addExternalUrl, setAddExternalUrl] = useState("");

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === spaceId) ?? null,
    [spaceId, spaces],
  );

  const load = useCallback(async () => {
    const [spacesPayload, reservationsPayload] = await Promise.all([
      springJson<{ spaces: SpaceSummary[] }>("/api/web/spaces"),
      springJson<{ plans: ReservationPlan[] }>("/api/web/reservations"),
    ]);
    setSpaces(spacesPayload.spaces);
    setPlans(reservationsPayload.plans);
    setSpaceId((current) => {
      if (current) return current;
      if (initialSpaceId && spacesPayload.spaces.some((space) => space.id === initialSpaceId)) {
        return initialSpaceId;
      }
      return spacesPayload.spaces[0]?.id || "";
    });
  }, [initialSpaceId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        await load();
      } catch (loadError) {
        if (active) setError(messageFrom(loadError, "예약 계획을 불러오지 못했습니다."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (actionError) {
      setError(messageFrom(actionError, "예약 기능 처리 중 오류가 발생했습니다."));
    } finally {
      setWorking(false);
    }
  };

  const createPlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      if (!spaceId) throw new Error("예약 계획을 저장할 공간을 선택해 주세요.");
      const result = await springJson<{ plan_id: string }>("/api/web/reservations", {
        method: "POST",
        body: JSON.stringify({
          spaceId,
          title: title.trim(),
          purpose,
          reservationDate,
          partySize,
          budgetPerPerson: budget ? Number(budget) : null,
          note: note.trim() || null,
        }),
      });

      if (placeName.trim()) {
        await springJson(`/api/web/reservations/${result.plan_id}/candidates`, {
          method: "POST",
          body: JSON.stringify({
            placeSource: initialPlaceName ? "tourapi" : "manual",
            placeId: initialPlaceId || null,
            placeName: placeName.trim(),
            category: category.trim() || null,
            address: address.trim() || null,
            startsAt: toIso(candidateStartsAt),
            externalReservationUrl: externalUrl.trim() || null,
          }),
        });
      }

      setNotice("함께 예약 계획을 만들었습니다. 공간 구성원에게 투표를 요청해 보세요.");
      setTitle("우리의 외출 계획");
      setNote("");
      setPlaceName("");
      setAddress("");
      setCategory("");
      setExternalUrl("");
      await load();
      window.setTimeout(() => document.getElementById("reservation-plans")?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  };

  const addCandidate = (event: FormEvent<HTMLFormElement>, planId: string) => {
    event.preventDefault();
    void run(async () => {
      await springJson(`/api/web/reservations/${planId}/candidates`, {
        method: "POST",
        body: JSON.stringify({
          placeSource: "manual",
          placeId: null,
          placeName: addPlaceName.trim(),
          category: addCategory.trim() || null,
          address: addAddress.trim() || null,
          startsAt: toIso(addStartsAt),
          externalReservationUrl: addExternalUrl.trim() || null,
        }),
      });
      setAddingToPlan(null);
      setAddPlaceName("");
      setAddAddress("");
      setAddCategory("");
      setAddExternalUrl("");
      setNotice("새 장소 후보를 추가했습니다.");
      await load();
    });
  };

  const toggleVote = (candidateId: string) => {
    void run(async () => {
      await springJson(`/api/web/reservations/candidates/${candidateId}/vote`, { method: "POST" });
      await load();
    });
  };

  const finalizePlan = (plan: ReservationPlan, candidate: Candidate) => {
    if (!window.confirm(`‘${candidate.place_name}’을 최종 장소로 정하고 공동 달력에 저장할까요?`)) return;
    void run(async () => {
      await springJson(`/api/web/reservations/${plan.id}/finalize`, {
        method: "POST",
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      setNotice("최종 장소와 시간을 공동 달력에 저장했습니다. 아직 실제 예약 완료 상태는 아닙니다.");
      await load();
    });
  };

  const changeStatus = (plan: ReservationPlan, status: "requested" | "confirmed" | "cancelled") => {
    const prompts = {
      requested: "외부 예약 페이지나 매장에 실제로 예약을 요청했나요?",
      confirmed: "매장에서 예약 확정 안내를 받았나요?",
      cancelled: "이 예약 계획을 취소 상태로 바꿀까요?",
    };
    if (!window.confirm(prompts[status])) return;
    void run(async () => {
      await springJson(`/api/web/reservations/${plan.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(status === "confirmed" ? "실제 예약 확정 상태로 변경했습니다." : "예약 상태를 변경했습니다.");
      await load();
    });
  };

  const deletePlan = (plan: ReservationPlan) => {
    if (!window.confirm(`‘${plan.title}’ 예약 계획과 투표를 삭제할까요?`)) return;
    void run(async () => {
      await springJson(`/api/web/reservations/${plan.id}`, { method: "DELETE" });
      setNotice("예약 계획을 삭제했습니다.");
      await load();
    });
  };

  if (loading) return <main className="reservation-loading">함께 예약 화면을 준비하는 중입니다.</main>;

  return (
    <main className="reservation-page">
      <header className="reservation-topbar">
        <a className="reservation-brand" href="/"><span>K</span>코리아픽</a>
        <nav><a href="/explore?category=음식">장소 찾기</a><a href="/spaces">함께 공간</a><a href="/">홈으로</a></nav>
      </header>

      <div className="reservation-shell">
        <section className="reservation-hero">
          <div>
            <p>RESERVE TOGETHER</p>
            <h1>같이 고르고,<br />함께 예약해요.</h1>
          </div>
          <ol>
            <li><span>01</span>관계·목적에 맞는 계획 만들기</li>
            <li><span>02</span>구성원이 후보 장소에 투표하기</li>
            <li><span>03</span>대표자가 확정하고 공동 달력에 저장하기</li>
          </ol>
        </section>

        {error && <p className="reservation-message is-error">{error}</p>}
        {notice && <p className="reservation-message is-success">{notice}</p>}

        <section className="reservation-create-section">
          <div className="reservation-section-copy">
            <p>NEW PLAN</p>
            <h2>함께 예약<br />계획 만들기</h2>
            <span>매장 제휴 전에는 외부 예약 페이지로 연결되며, 실제 매장 확인 전까지는 예약 완료로 표시하지 않아요.</span>
          </div>

          <form className="reservation-create-form" onSubmit={createPlan}>
            <label className="is-wide">저장할 공간
              <select value={spaceId} onChange={(event) => setSpaceId(event.target.value)} required>
                {spaces.map((space) => <option key={space.id} value={space.id}>{spaceLabels[space.space_type]} · {space.name} ({space.member_count}명)</option>)}
              </select>
            </label>

            <fieldset className="is-wide">
              <legend>외출 목적</legend>
              <div className="reservation-purpose-list">
                {purposes.map((item) => <button type="button" className={purpose === item ? "is-active" : ""} onClick={() => setPurpose(item)} key={item}>{item}</button>)}
              </div>
            </fieldset>

            <label className="is-wide">계획 이름
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required />
            </label>
            <label>날짜
              <input type="date" value={reservationDate} min={today} onChange={(event) => {
                setReservationDate(event.target.value);
                setCandidateStartsAt(`${event.target.value}T18:00`);
              }} required />
            </label>
            <label>인원
              <input type="number" value={partySize} min={1} max={50} onChange={(event) => setPartySize(Number(event.target.value))} required />
            </label>
            <label>1인 예산 · 원
              <input type="number" value={budget} min={0} max={10000000} step={1000} placeholder="선택 입력" onChange={(event) => setBudget(event.target.value)} />
            </label>
            <label>공간 유형
              <input value={selectedSpace ? spaceLabels[selectedSpace.space_type] : ""} readOnly />
            </label>
            <label className="is-wide">메모
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="분위기, 이동 조건, 알레르기 등 함께 확인할 내용을 적어 주세요." />
            </label>

            <div className="reservation-candidate-prefill is-wide">
              <header><strong>첫 번째 장소 후보</strong><span>선택 사항 · 나중에 추가 가능</span></header>
              <label>장소명<input value={placeName} onChange={(event) => setPlaceName(event.target.value)} maxLength={120} placeholder="예: 광교 호수공원 근처 식당" /></label>
              <label>분류<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={40} placeholder="예: 음식 · 카페" /></label>
              <label className="is-wide">주소<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={240} /></label>
              <label>방문 시간<input type="datetime-local" value={candidateStartsAt} onChange={(event) => setCandidateStartsAt(event.target.value)} /></label>
              <label>외부 예약 링크<input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} maxLength={1000} placeholder="매장 홈페이지 또는 예약 페이지" /></label>
            </div>

            <button className="reservation-primary-button is-wide" type="submit" disabled={working || spaces.length === 0}>{working ? "저장 중" : "투표할 예약 계획 만들기 →"}</button>
          </form>
        </section>

        <section className="reservation-plans-section" id="reservation-plans">
          <div className="reservation-section-heading">
            <div><p>OUR PLANS</p><h2>함께 정하는 예약</h2></div>
            <span>{plans.length}개 계획</span>
          </div>

          {plans.length === 0 && <div className="reservation-empty"><strong>아직 예약 계획이 없어요.</strong><span>첫 계획을 만들거나 장소 탐색 화면에서 후보를 골라보세요.</span></div>}

          <div className="reservation-plan-list">
            {plans.map((plan) => {
              const state = statusInfo[plan.status];
              return (
                <article className={`reservation-plan-card is-${plan.status}`} key={plan.id}>
                  <header>
                    <div><span>{spaceLabels[plan.space_type]} · {plan.space_name}</span><h3>{plan.title}</h3><p>{plan.purpose} · {new Date(`${plan.reservation_date}T00:00:00`).toLocaleDateString("ko-KR")} · {plan.party_size}명{plan.budget_per_person !== null ? ` · 1인 ${plan.budget_per_person.toLocaleString("ko-KR")}원` : ""}</p></div>
                    <div className="reservation-status"><strong>{state.label}</strong><span>{state.detail}</span></div>
                  </header>

                  {plan.note && <p className="reservation-plan-note">{plan.note}</p>}

                  <div className="reservation-candidate-list">
                    {plan.candidates.length === 0 && <p className="reservation-no-candidate">아직 후보 장소가 없습니다. 구성원이 첫 후보를 추가해 주세요.</p>}
                    {plan.candidates.map((candidate, index) => (
                      <article className={`reservation-candidate-card ${candidate.is_selected ? "is-selected" : ""}`} key={candidate.id}>
                        <div className="reservation-candidate-rank"><span>{candidate.is_selected ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{candidate.vote_count}표</strong></div>
                        <div className="reservation-candidate-copy">
                          <span>{candidate.category || "장소 후보"}</span>
                          <h4>{candidate.place_name}</h4>
                          <p>{candidate.address || "주소 미입력"}</p>
                          <time>{new Date(candidate.starts_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</time>
                          {candidate.voters.length > 0 && <small>투표: {candidate.voters.map((voter) => voter.display_name).join(", ")}</small>}
                        </div>
                        <div className="reservation-candidate-actions">
                          <button className={candidate.voted_by_me ? "is-voted" : ""} type="button" disabled={working || !(["voting", "ready"] as PlanStatus[]).includes(plan.status)} onClick={() => toggleVote(candidate.id)}>{candidate.voted_by_me ? "내 투표 취소" : "이 장소에 투표"}</button>
                          {plan.can_manage && (["voting", "ready"] as PlanStatus[]).includes(plan.status) && <button type="button" disabled={working || candidate.is_selected} onClick={() => finalizePlan(plan, candidate)}>{candidate.is_selected ? "달력 저장됨" : "최종 장소 확정"}</button>}
                          <a href={searchUrl("kakao", candidate)} target="_blank" rel="noopener noreferrer">카카오맵 확인 ↗</a>
                          <a href={candidate.external_reservation_url || searchUrl("naver", candidate)} target="_blank" rel="noopener noreferrer">{candidate.external_reservation_url ? "외부 예약 페이지 ↗" : "예약 방법 검색 ↗"}</a>
                        </div>
                      </article>
                    ))}
                  </div>

                  {addingToPlan === plan.id ? (
                    <form className="reservation-add-candidate" onSubmit={(event) => addCandidate(event, plan.id)}>
                      <strong>새 장소 후보</strong>
                      <label>장소명<input value={addPlaceName} onChange={(event) => setAddPlaceName(event.target.value)} maxLength={120} required /></label>
                      <label>분류<input value={addCategory} onChange={(event) => setAddCategory(event.target.value)} maxLength={40} /></label>
                      <label className="is-wide">주소<input value={addAddress} onChange={(event) => setAddAddress(event.target.value)} maxLength={240} /></label>
                      <label>방문 시간<input type="datetime-local" value={addStartsAt} onChange={(event) => setAddStartsAt(event.target.value)} required /></label>
                      <label>외부 예약 링크<input type="url" value={addExternalUrl} onChange={(event) => setAddExternalUrl(event.target.value)} maxLength={1000} /></label>
                      <div className="is-wide"><button type="button" onClick={() => setAddingToPlan(null)}>닫기</button><button type="submit" disabled={working}>후보 추가</button></div>
                    </form>
                  ) : (["voting", "ready"] as PlanStatus[]).includes(plan.status) && (
                    <button className="reservation-add-trigger" type="button" onClick={() => {
                      setAddingToPlan(plan.id);
                      setAddStartsAt(`${plan.reservation_date}T18:00`);
                    }}>+ 후보 장소 추가</button>
                  )}

                  {plan.can_manage && (
                    <footer className="reservation-plan-actions">
                      {plan.status === "ready" && <button type="button" onClick={() => changeStatus(plan, "requested")}>예약 요청 중으로 표시</button>}
                      {plan.status === "requested" && <button className="is-confirm" type="button" onClick={() => changeStatus(plan, "confirmed")}>매장 확인 후 예약 확정</button>}
                      {plan.status !== "cancelled" && plan.status !== "confirmed" && <button type="button" onClick={() => changeStatus(plan, "cancelled")}>계획 취소</button>}
                      <button className="is-danger" type="button" onClick={() => deletePlan(plan)}>계획 삭제</button>
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
