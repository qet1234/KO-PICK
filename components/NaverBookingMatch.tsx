"use client";

import { useMemo, useState } from "react";
import { naverBookingSearchUrl } from "@/utils/external-booking";

type BookingCandidate = {
  id: string;
  place_name: string;
  place_source: string;
  category: string | null;
  address: string | null;
  starts_at: string;
};

type BookingMatch = {
  matched: boolean;
  confidence?: number;
  name?: string;
  address?: string;
  category?: string;
  mapUrl?: string;
  bookingUrl?: string;
  notice?: string;
  reason?: string;
};

type Props = {
  candidate: BookingCandidate;
  reservationDate: string;
  partySize: number;
};

const timeSlots = Array.from({ length: 25 }, (_, index) => {
  const totalMinutes = 11 * 60 + index * 30;
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

function localTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "18:00";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function NaverBookingMatch({ candidate, reservationDate, partySize }: Props) {
  const eligible = useMemo(
    () =>
      candidate.place_source.toLowerCase().includes("tour") &&
      /(?:음식|맛집|restaurant)/i.test(candidate.category || "") &&
      Boolean(candidate.address?.trim()),
    [candidate],
  );
  const [checking, setChecking] = useState(false);
  const [match, setMatch] = useState<BookingMatch | null>(null);
  const [date, setDate] = useState(reservationDate);
  const [time, setTime] = useState(localTime(candidate.starts_at));
  const [people, setPeople] = useState(Math.min(Math.max(partySize, 1), 20));

  const fallbackUrl = naverBookingSearchUrl({
    name: candidate.place_name,
    address: candidate.address,
  });

  if (!eligible) {
    return (
      <a className="is-naver-booking" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
        네이버 예약 확인 ↗
      </a>
    );
  }

  const verify = async () => {
    if (checking) return;
    setChecking(true);
    setMatch(null);
    try {
      const params = new URLSearchParams({
        name: candidate.place_name,
        address: candidate.address || "",
        source: candidate.place_source,
        category: candidate.category || "",
      });
      const response = await fetch(`/api/naver/booking-match?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as BookingMatch;
      setMatch(payload);
    } catch {
      setMatch({ matched: false, reason: "네이버 음식점 확인 중 오류가 발생했습니다." });
    } finally {
      setChecking(false);
    }
  };

  const rememberSelection = () => {
    try {
      window.localStorage.setItem(
        "kopick:last-naver-booking",
        JSON.stringify({
          placeId: candidate.id,
          placeName: match?.name || candidate.place_name,
          date,
          time,
          partySize: people,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // 저장 실패가 외부 예약 화면 이동을 막지 않도록 합니다.
    }
  };

  return (
    <div className="reservation-naver-match">
      {!match && (
        <button className="is-naver-booking" type="button" disabled={checking} onClick={verify}>
          {checking ? "TourAPI·네이버 확인 중…" : "TourAPI·네이버 일치 확인"}
        </button>
      )}

      {match && !match.matched && (
        <div className="reservation-match-result is-unmatched">
          <strong>일치 매장을 확인하지 못했어요.</strong>
          <span>{match.reason || "네이버에서 직접 확인해 주세요."}</span>
          <div>
            <button type="button" onClick={verify} disabled={checking}>다시 확인</button>
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">네이버 직접 검색 ↗</a>
          </div>
        </div>
      )}

      {match?.matched && (
        <div className="reservation-match-result is-matched">
          <div className="reservation-match-badge">TourAPI · 네이버 장소 일치</div>
          <strong>{match.name}</strong>
          <span>{match.address}</span>
          <div className="reservation-booking-options">
            <label>
              <span>날짜</span>
              <input type="date" min={todayKey()} value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              <span>시간대</span>
              <select value={time} onChange={(event) => setTime(event.target.value)}>
                {!timeSlots.includes(time) && <option value={time}>{time}</option>}
                {timeSlots.map((slot) => <option value={slot} key={slot}>{slot}</option>)}
              </select>
            </label>
            <label>
              <span>인원수</span>
              <select value={people} onChange={(event) => setPeople(Number(event.target.value))}>
                {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
                  <option value={count} key={count}>{count}명</option>
                ))}
              </select>
            </label>
          </div>
          <p>{date} · {time} · {people}명으로 예약을 이어갑니다.</p>
          <a
            className="reservation-naver-continue"
            href={match.bookingUrl || fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={rememberSelection}
          >
            네이버 예약 화면 열기 ↗
          </a>
          <small>{match.notice || "실제 예약 가능 여부와 시간은 네이버에서 최종 확인됩니다."}</small>
        </div>
      )}
    </div>
  );
}
