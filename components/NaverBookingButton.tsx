"use client";

import { useEffect, useState } from "react";
import { isNaverBookingCategory } from "@/utils/external-booking";

type BookingMatch = {
  matched: boolean;
  bookable?: boolean;
  bookingUrl?: string | null;
};

type Props = {
  name: string;
  address?: string | null;
  category?: string | null;
  source?: string | null;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
};

export default function NaverBookingButton({
  name,
  address,
  category,
  source = "tour",
  compact = false,
  className,
  onClick,
}: Props) {
  const requestKey = [name, address || "", category || "", source || ""].join("\u0000");
  const eligible =
    Boolean(name.trim()) &&
    Boolean(address?.trim()) &&
    Boolean(source?.toLowerCase().includes("tour")) &&
    isNaverBookingCategory(category);
  const [booking, setBooking] = useState<{ key: string; url: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (!eligible) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      name,
      address: address || "",
      source: source || "",
      category: category || "",
    });

    void fetch(`/api/naver/booking-match?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as BookingMatch;
      })
      .then((match) => {
        if (!controller.signal.aborted) {
          setBooking({
            key: requestKey,
            url:
              match?.matched && match.bookable && match.bookingUrl
                ? match.bookingUrl
                : null,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setBooking({ key: requestKey, url: null });
        }
      });

    return () => controller.abort();
  }, [address, category, eligible, name, requestKey, source]);

  const bookingUrl = eligible && booking?.key === requestKey ? booking.url : null;
  if (!bookingUrl) return null;

  const classes = [className, compact ? "is-booking" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      className={classes || undefined}
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} 네이버 예약`}
      onClick={onClick}
    >
      {compact ? "N 예약 ↗" : (
        <>
          <span className="kp-naver-booking-brand" aria-hidden="true">
            <b>N</b>
            예약
          </span>
          <span className="kp-naver-booking-copy">
            <strong>네이버 예약</strong>
            <small>날짜 · 인원 · 시간을 선택하세요</small>
          </span>
          <svg
            className="kp-naver-booking-arrow"
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </>
      )}
    </a>
  );
}
