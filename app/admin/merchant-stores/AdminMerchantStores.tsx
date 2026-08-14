"use client";

import { useMemo, useState } from "react";

export type MerchantApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

export type AdminMerchantStore = {
  id: string;
  owner_user_id: string;
  owner_email: string;
  owner_name: string;
  place_source: string;
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  approval_status: MerchantApprovalStatus;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<MerchantApprovalStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
  suspended: "운영 중지",
};

const sourceLabels: Record<string, string> = {
  TOUR_API: "TourAPI",
  NAVER_LOCAL: "네이버 지역검색",
  MANUAL: "직접 등록",
};

function dateTime(value: string | null) {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminMerchantStores({ initialStores }: { initialStores: AdminMerchantStore[] }) {
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | MerchantApprovalStatus>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const counts = useMemo(() => ({
    all: stores.length,
    pending: stores.filter((store) => store.approval_status === "pending").length,
    approved: stores.filter((store) => store.approval_status === "approved").length,
    rejected: stores.filter((store) => store.approval_status === "rejected").length,
    suspended: stores.filter((store) => store.approval_status === "suspended").length,
  }), [stores]);

  const visibleStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return stores.filter((store) => {
      const matchesStatus = status === "all" || store.approval_status === status;
      const matchesQuery = !normalized || [
        store.name,
        store.address ?? "",
        store.phone ?? "",
        store.owner_email,
        store.owner_name,
        store.place_id,
      ].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [query, status, stores]);

  async function updateStatus(store: AdminMerchantStore, nextStatus: MerchantApprovalStatus) {
    if (["rejected", "suspended"].includes(nextStatus)) {
      const confirmed = window.confirm(`${store.name} 매장을 ${statusLabels[nextStatus]} 상태로 변경할까요?`);
      if (!confirmed) return;
    }

    setBusyId(store.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/merchant-stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reviewNote: notes[store.id]?.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "입점 상태를 저장하지 못했습니다.");

      setStores((current) => current.map((item) => (
        item.id === store.id ? { ...item, ...data.store } : item
      )));
      setMessage(`${store.name} 매장을 ${statusLabels[nextStatus]} 처리했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "입점 상태를 저장하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="merchant-applications">
      <div className="merchant-metric-grid">
        <article className="is-pending"><small>승인 대기</small><strong>{counts.pending}</strong><span>검토가 필요한 신청</span></article>
        <article className="is-approved"><small>승인 매장</small><strong>{counts.approved}</strong><span>고객 예약 노출 중</span></article>
        <article><small>전체 신청</small><strong>{counts.all}</strong><span>누적 입점 신청</span></article>
        <article className="is-hold"><small>반려·중지</small><strong>{counts.rejected + counts.suspended}</strong><span>재검토 가능</span></article>
      </div>

      {message ? <div className="merchant-admin-message" role="status">{message}</div> : null}

      <div className="merchant-admin-tools">
        <label>
          <span>신청 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="매장명, 주소, 사장님 이메일, 장소 ID"
          />
        </label>
        <div className="merchant-status-filter" aria-label="입점 상태 필터">
          {(["pending", "approved", "rejected", "suspended", "all"] as const).map((item) => (
            <button
              className={status === item ? "is-active" : ""}
              key={item}
              onClick={() => setStatus(item)}
              type="button"
            >
              {item === "all" ? "전체" : statusLabels[item]} <span>{counts[item]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="merchant-application-list">
        {visibleStores.map((store) => (
          <article className="merchant-application-card" key={store.id}>
            <div className="merchant-card-head">
              <div>
                <span className={`merchant-status is-${store.approval_status}`}>{statusLabels[store.approval_status]}</span>
                <span className="merchant-source">{sourceLabels[store.place_source] ?? store.place_source}</span>
                <h2>{store.name}</h2>
                <p>{store.address || "주소 미입력"} · {store.phone || "연락처 미입력"}</p>
              </div>
              <time>신청 {dateTime(store.created_at)}</time>
            </div>

            <div className="merchant-detail-grid">
              <div><small>신청 계정</small><strong>{store.owner_name}</strong><span>{store.owner_email}</span></div>
              <div><small>장소 식별자</small><strong>{store.place_source}</strong><span>{store.place_id}</span></div>
              <div><small>최근 검토</small><strong>{dateTime(store.reviewed_at)}</strong><span>{store.review_note || "검토 메모 없음"}</span></div>
            </div>

            <div className="merchant-review-box">
              <label htmlFor={`review-note-${store.id}`}>운영자 검토 메모</label>
              <textarea
                id={`review-note-${store.id}`}
                maxLength={500}
                onChange={(event) => setNotes((current) => ({ ...current, [store.id]: event.target.value }))}
                placeholder="반려 또는 중지 사유, 확인한 내용을 기록하세요."
                value={notes[store.id] ?? store.review_note ?? ""}
              />
              <div className="merchant-card-actions">
                {store.approval_status !== "approved" ? <button disabled={busyId === store.id} onClick={() => updateStatus(store, "approved")} type="button">승인</button> : null}
                {store.approval_status === "pending" ? <button className="is-reject" disabled={busyId === store.id} onClick={() => updateStatus(store, "rejected")} type="button">반려</button> : null}
                {store.approval_status === "approved" ? <button className="is-suspend" disabled={busyId === store.id} onClick={() => updateStatus(store, "suspended")} type="button">예약 운영 중지</button> : null}
                {store.approval_status === "rejected" || store.approval_status === "suspended" ? <button className="is-secondary" disabled={busyId === store.id} onClick={() => updateStatus(store, "pending")} type="button">재검토 대기</button> : null}
                {busyId === store.id ? <span>저장 중…</span> : null}
              </div>
            </div>
          </article>
        ))}
        {visibleStores.length === 0 ? <div className="merchant-admin-empty">조건에 맞는 입점 신청이 없습니다.</div> : null}
      </div>
    </section>
  );
}
