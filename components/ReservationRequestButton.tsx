"use client";

import { FormEvent, useState } from "react";
import styles from "./ReservationRequestButton.module.css";

type Props = {
  placeId: string;
  placeName: string;
  placeSource: "TOUR_API" | "NAVER_LOCAL";
  address?: string | null;
  category?: string | null;
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function ReservationRequestButton({ placeId, placeName, placeSource, address, category }: Props) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const eligible = category?.includes("음식") || category?.includes("카페");
  if (!eligible) return null;

  const start = async () => {
    setChecking(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ placeSource, placeId });
      const response = await fetch(`/api/reservations?${params.toString()}`, { cache: "no-store" });
      const data = await response.json() as { bookable?: boolean };
      if (!data.bookable) {
        setMessage("아직 오늘어디 예약을 받지 않는 매장이에요.");
        return;
      }
      setOpen(true);
    } catch {
      setMessage("예약 가능 여부를 확인하지 못했습니다.");
    } finally {
      setChecking(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeSource, placeId,
          reservationDate: form.get("reservationDate"),
          reservationTime: form.get("reservationTime"),
          partySize: Number(form.get("partySize")),
          guestName: form.get("guestName"),
          customerPhone: form.get("customerPhone"),
          menu: form.get("menu"),
          note: form.get("note"),
        }),
      });
      const data = await response.json() as { error?: string; loginRequired?: boolean };
      if (data.loginRequired) {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || "예약 신청에 실패했습니다.");
      setOpen(false);
      window.alert("예약 신청이 접수되었습니다. 사장님 승인 후 확정됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "예약 신청에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <button className={styles.trigger} type="button" onClick={start} disabled={checking}>
      <span>어</span>{checking ? "예약 확인 중…" : "오늘어디 예약"}
    </button>
    {message && !open && <small className={styles.inlineMessage}>{message}</small>}
    {open && <div className={styles.backdrop} onMouseDown={() => setOpen(false)}>
      <section className={styles.modal} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${placeName} 예약 신청`}>
        <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="닫기">×</button>
        <span className={styles.eyebrow}>오늘어디 예약</span>
        <h2>{placeName}</h2>
        <p>{address || "매장 주소 확인 중"}</p>
        <form onSubmit={submit}>
          <div className={styles.grid}>
            <label>날짜<input name="reservationDate" type="date" min={todayKey()} defaultValue={todayKey()} required /></label>
            <label>시간<input name="reservationTime" type="time" defaultValue="18:00" required /></label>
            <label>인원<select name="partySize" defaultValue="2">{Array.from({ length: 20 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}명</option>)}</select></label>
            <label>예약자명<input name="guestName" maxLength={60} required /></label>
            <label className={styles.full}>연락처<input name="customerPhone" type="tel" placeholder="010-0000-0000" maxLength={30} required /></label>
            <label className={styles.full}>메뉴 또는 코스<input name="menu" maxLength={120} placeholder="선택 사항" /></label>
            <label className={styles.full}>요청사항<textarea name="note" maxLength={500} placeholder="알레르기, 유아 의자 등" /></label>
          </div>
          {message && <div className={styles.error}>{message}</div>}
          <button className={styles.submit} type="submit" disabled={saving}>{saving ? "접수 중…" : "예약 신청하기"}</button>
          <small className={styles.notice}>예약은 매장 승인 후 최종 확정됩니다.</small>
        </form>
      </section>
    </div>}
  </>;
}
