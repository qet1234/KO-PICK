"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DateParts = { year: number; month: number; day: number };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseDateKey(value: string): DateParts {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function toDate(parts: DateParts) {
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthIndex(year: number, month: number) {
  return year * 12 + month - 1;
}

function setNativeDate(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function CalendarPicker({ input }: { input: HTMLInputElement }) {
  const minValue = input.min || dateKey(new Date());
  const maxValue = input.max || minValue;
  const [value, setValue] = useState(input.value || minValue);
  const initial = parseDateKey(input.value || minValue);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const min = parseDateKey(minValue);
  const max = parseDateKey(maxValue);
  const minMonth = monthIndex(min.year, min.month);
  const maxMonth = monthIndex(max.year, max.month);
  const currentMonth = monthIndex(viewYear, viewMonth);

  useEffect(() => {
    const sync = () => {
      const nextValue = input.value || minValue;
      setValue(nextValue);
      const next = parseDateKey(nextValue);
      setViewYear(next.year);
      setViewMonth(next.month);
    };
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    return () => {
      input.removeEventListener("input", sync);
      input.removeEventListener("change", sync);
    };
  }, [input, minValue]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const years = useMemo(
    () => Array.from({ length: max.year - min.year + 1 }, (_, index) => min.year + index),
    [max.year, min.year],
  );

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1, 12);
    const start = new Date(viewYear, viewMonth - 1, 1 - first.getDay(), 12);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewMonth, viewYear]);

  const selected = toDate(parseDateKey(value));
  const selectedLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(selected);

  const moveMonth = (offset: number) => {
    const date = new Date(viewYear, viewMonth - 1 + offset, 1, 12);
    const nextIndex = monthIndex(date.getFullYear(), date.getMonth() + 1);
    if (nextIndex < minMonth || nextIndex > maxMonth) return;
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };

  const selectDate = (date: Date) => {
    const next = dateKey(date);
    if (next < minValue || next > maxValue) return;
    setValue(next);
    setNativeDate(input, next);
    setOpen(false);
  };

  const changeYear = (year: number) => {
    let month = viewMonth;
    if (monthIndex(year, month) < minMonth) month = min.month;
    if (monthIndex(year, month) > maxMonth) month = max.month;
    setViewYear(year);
    setViewMonth(month);
  };

  return (
    <div className="recommend-calendar-shell" ref={shellRef}>
      <button
        type="button"
        className="recommend-calendar-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <span>{selectedLabel}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
        </svg>
      </button>

      {open && (
        <div
          className="recommend-calendar-popover"
          role="dialog"
          aria-label="방문 날짜 선택 달력"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="recommend-calendar-toolbar">
            <button type="button" onClick={() => moveMonth(-1)} disabled={currentMonth <= minMonth} aria-label="이전 달">‹</button>
            <div>
              <select value={viewYear} onChange={(event) => changeYear(Number(event.target.value))} aria-label="연도 선택">
                {years.map((year) => <option key={year} value={year}>{year}년</option>)}
              </select>
              <select value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))} aria-label="월 선택">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                  const index = monthIndex(viewYear, month);
                  return <option key={month} value={month} disabled={index < minMonth || index > maxMonth}>{month}월</option>;
                })}
              </select>
            </div>
            <button type="button" onClick={() => moveMonth(1)} disabled={currentMonth >= maxMonth} aria-label="다음 달">›</button>
          </div>

          <div className="recommend-calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>

          <div className="recommend-calendar-grid">
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const outside = date.getMonth() + 1 !== viewMonth;
              const disabled = key < minValue || key > maxValue;
              const isSelected = key === value;
              const isToday = key === dateKey(new Date());
              const weekday = date.getDay();
              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    outside ? "is-outside" : "",
                    isSelected ? "is-selected" : "",
                    isToday ? "is-today" : "",
                    weekday === 0 ? "is-sunday" : "",
                    weekday === 6 ? "is-saturday" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={disabled}
                  aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[weekday]}요일`}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="recommend-calendar-footer">
            <span>선택: {selectedLabel}</span>
            <button type="button" onClick={() => selectDate(new Date())} disabled={dateKey(new Date()) < minValue || dateKey(new Date()) > maxValue}>오늘</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecommendCalendarEnhancer() {
  const [target, setTarget] = useState<{ input: HTMLInputElement; host: HTMLDivElement } | null>(null);

  useEffect(() => {
    let disposed = false;
    let mounted: { input: HTMLInputElement; host: HTMLDivElement } | null = null;

    const clearMounted = () => {
      if (!mounted) return;
      mounted.host.remove();
      mounted.input.classList.remove("is-calendar-source");
      delete mounted.input.dataset.calendarEnhanced;
      mounted = null;
      setTarget(null);
    };

    const syncMount = () => {
      if (disposed) return;
      if (mounted && document.body.contains(mounted.input) && document.body.contains(mounted.host)) {
        return;
      }
      if (mounted) clearMounted();

      const input = document.querySelector<HTMLInputElement>(
        '.recommend-date-field input[type="date"]',
      );
      if (!input || input.dataset.calendarEnhanced === "true") return;
      input.dataset.calendarEnhanced = "true";
      input.classList.add("is-calendar-source");
      const host = document.createElement("div");
      host.className = "recommend-calendar-host";
      input.insertAdjacentElement("afterend", host);
      mounted = { input, host };
      setTarget(mounted);
    };

    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      if (mounted) {
        mounted.host.remove();
        mounted.input.classList.remove("is-calendar-source");
        delete mounted.input.dataset.calendarEnhanced;
      }
    };
  }, []);

  return target ? createPortal(<CalendarPicker input={target.input} />, target.host) : null;
}
