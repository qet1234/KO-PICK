"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type CoupleInfo = {
  couple_id: string;
  member_role: "creator" | "partner";
  member_count: number;
  invite_expires_at: string | null;
  invite_used: boolean;
  created_at: string;
};

type CoupleMember = {
  user_id: string;
  display_name: string;
  role: "creator" | "partner";
  joined_at: string;
};

type Anniversary = {
  id: string;
  couple_id: string;
  title: string;
  anniversary_date: string;
  repeats_yearly: boolean;
  note: string | null;
  created_by: string;
};

type CalendarEvent = {
  id: string;
  couple_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  note: string | null;
  color: "red" | "blue" | "lime" | "pink" | "black";
  created_by: string;
};

type InviteResult = {
  invite_code: string;
  invite_expires_at: string;
};

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
const eventColors: CalendarEvent["color"][] = [
  "red",
  "blue",
  "lime",
  "pink",
  "black",
];

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function anniversaryOccursOn(item: Anniversary, day: Date) {
  const source = parseDateKey(item.anniversary_date);
  if (item.repeats_yearly) {
    return source.getMonth() === day.getMonth() && source.getDate() === day.getDate();
  }
  return localDateKey(source) === localDateKey(day);
}

function nextAnniversary(item: Anniversary) {
  const original = parseDateKey(item.anniversary_date);
  if (!item.repeats_yearly) return original;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return next;
}

type ErrorLike = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

function errorString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function friendlyError(error: unknown, fallback: string) {
  const errorLike =
    typeof error === "object" && error !== null ? (error as ErrorLike) : null;
  const message =
    error instanceof Error
      ? error.message.trim()
      : errorString(errorLike?.message) || errorString(error);
  const code = errorString(errorLike?.code);
  const hint = errorString(errorLike?.hint);
  const details = errorString(errorLike?.details);
  const searchable = [message, hint, details].join(" ").toLowerCase();

  if (code === "PGRST202" || searchable.includes("schema cache")) {
    return "개발 중입니다.";
  }
  if (code === "42501" || searchable.includes("permission denied")) {
    return "커플 공간 데이터베이스 실행 권한이 없습니다. 권한 설정을 다시 적용해 주세요. [42501]";
  }
  if (
    searchable.includes("failed to fetch") ||
    searchable.includes("networkerror")
  ) {
    return "Supabase 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  const usefulMessage = message || hint || details;
  if (!usefulMessage) return fallback;
  return code ? usefulMessage + " [" + code + "]" : usefulMessage;
}

export default function CoupleSpace() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [userId, setUserId] = useState("");
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  const [anniversaryTitle, setAnniversaryTitle] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState(localDateKey(new Date()));
  const [anniversaryRepeats, setAnniversaryRepeats] = useState(true);
  const [anniversaryNote, setAnniversaryNote] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(localDateKey(new Date()));
  const [eventStartTime, setEventStartTime] = useState("18:00");
  const [eventEndTime, setEventEndTime] = useState("19:00");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventLocation, setEventLocation] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [eventColor, setEventColor] = useState<CalendarEvent["color"]>("red");

  const loadPrivateData = useCallback(async (coupleId: string) => {
    const supabase = createClient();
    const [memberResult, anniversaryResult, eventResult] = await Promise.all([
      supabase
        .from("couple_members")
        .select("user_id,display_name,role,joined_at")
        .eq("couple_id", coupleId)
        .order("joined_at"),
      supabase
        .from("couple_anniversaries")
        .select("id,couple_id,title,anniversary_date,repeats_yearly,note,created_by")
        .eq("couple_id", coupleId)
        .order("anniversary_date"),
      supabase
        .from("couple_calendar_events")
        .select("id,couple_id,title,starts_at,ends_at,all_day,location,note,color,created_by")
        .eq("couple_id", coupleId)
        .order("starts_at"),
    ]);

    const firstError =
      memberResult.error ?? anniversaryResult.error ?? eventResult.error;
    if (firstError) throw firstError;

    setMembers((memberResult.data ?? []) as CoupleMember[]);
    setAnniversaries((anniversaryResult.data ?? []) as Anniversary[]);
    setEvents((eventResult.data ?? []) as CalendarEvent[]);
  }, []);

  const loadCouple = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.replace("/login");
      return;
    }

    setUserId(user.id);
    const { data, error } = await supabase.rpc("get_my_couple");
    if (error) throw error;

    const row = ((data ?? []) as CoupleInfo[])[0] ?? null;
    setCouple(row);
    if (row) {
      await loadPrivateData(row.couple_id);
    } else {
      setMembers([]);
      setAnniversaries([]);
      setEvents([]);
    }
  }, [loadPrivateData]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        await loadCouple();
      } catch (error) {
        if (active) {
          setErrorMessage(
            friendlyError(error, "커플 공간을 불러오지 못했습니다.")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [loadCouple]);

  useEffect(() => {
    if (!couple) return;

    const supabase = createClient();
    const refresh = () => void loadPrivateData(couple.couple_id);
    const channel = supabase
      .channel("private-couple-" + couple.couple_id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_members",
          filter: "couple_id=eq." + couple.couple_id,
        },
        () => void loadCouple()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_anniversaries",
          filter: "couple_id=eq." + couple.couple_id,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_calendar_events",
          filter: "couple_id=eq." + couple.couple_id,
        },
        refresh
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [couple, loadCouple, loadPrivateData]);

  const runAction = async (action: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    setErrorMessage("");
    setNotice("");
    try {
      await action();
    } catch (error) {
      console.error("Couple space action failed", error);
      setErrorMessage(
        friendlyError(error, "처리 중 오류가 발생했습니다.")
      );
    } finally {
      setWorking(false);
    }
  };

  const createSpace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(async () => {
      const name = createName.trim();
      if (!name) throw new Error("커플 공간에서 사용할 닉네임을 입력해 주세요.");

      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_couple_space", {
        display_name_input: name,
      });
      if (error) throw error;

      const result = ((data ?? []) as Array<InviteResult & { couple_id: string }>)[0];
      if (!result) throw new Error("초대 코드를 만들지 못했습니다.");

      setInvite({
        invite_code: result.invite_code,
        invite_expires_at: result.invite_expires_at,
      });
      setNotice("커플 공간이 생성되었습니다. 상대방에게 초대 코드를 보내 주세요.");
      await loadCouple();
    });
  };

  const joinSpace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(async () => {
      const name = joinName.trim();
      const code = joinCode.replace(/\s+/g, "").toUpperCase();
      if (!name || !code) throw new Error("닉네임과 초대 코드를 모두 입력해 주세요.");

      const supabase = createClient();
      const { error } = await supabase.rpc("join_couple_space", {
        invite_code_input: code,
        display_name_input: name,
      });
      if (error) throw error;

      setNotice("두 사람의 커플 공간이 연결되었습니다.");
      await loadCouple();
    });
  };

  const refreshInvite = () => {
    void runAction(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("refresh_couple_invite");
      if (error) throw error;

      const result = ((data ?? []) as InviteResult[])[0];
      if (!result) throw new Error("초대 코드를 만들지 못했습니다.");
      setInvite(result);
      setNotice("24시간 동안 유효한 새 초대 코드를 만들었습니다.");
    });
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invite_code);
      setNotice("초대 코드를 복사했습니다.");
    } catch {
      setErrorMessage("복사하지 못했습니다. 코드를 직접 선택해 주세요.");
    }
  };

  const addAnniversary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couple) return;

    void runAction(async () => {
      if (!anniversaryTitle.trim()) throw new Error("기념일 이름을 입력해 주세요.");
      const supabase = createClient();
      const { error } = await supabase.from("couple_anniversaries").insert({
        couple_id: couple.couple_id,
        title: anniversaryTitle.trim(),
        anniversary_date: anniversaryDate,
        repeats_yearly: anniversaryRepeats,
        note: anniversaryNote.trim() || null,
        created_by: userId,
      });
      if (error) throw error;

      setAnniversaryTitle("");
      setAnniversaryNote("");
      setNotice("기념일을 저장했습니다.");
      await loadPrivateData(couple.couple_id);
    });
  };

  const addCalendarEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!couple) return;

    void runAction(async () => {
      if (!eventTitle.trim()) throw new Error("일정 이름을 입력해 주세요.");

      const startsAt = new Date(
        eventDate + "T" + (eventAllDay ? "00:00" : eventStartTime) + ":00"
      );
      const endsAt = eventAllDay
        ? null
        : new Date(eventDate + "T" + eventEndTime + ":00");

      if (endsAt && endsAt < startsAt) {
        throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
      }

      const supabase = createClient();
      const { error } = await supabase.from("couple_calendar_events").insert({
        couple_id: couple.couple_id,
        title: eventTitle.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() ?? null,
        all_day: eventAllDay,
        location: eventLocation.trim() || null,
        note: eventNote.trim() || null,
        color: eventColor,
        created_by: userId,
      });
      if (error) throw error;

      setEventTitle("");
      setEventLocation("");
      setEventNote("");
      setNotice("일정을 저장했습니다.");
      await loadPrivateData(couple.couple_id);
    });
  };

  const removeAnniversary = (item: Anniversary) => {
    if (!window.confirm("'" + item.title + "' 기념일을 삭제할까요?")) return;
    void runAction(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("couple_anniversaries")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      setNotice("기념일을 삭제했습니다.");
      if (couple) await loadPrivateData(couple.couple_id);
    });
  };

  const removeEvent = (item: CalendarEvent) => {
    if (!window.confirm("'" + item.title + "' 일정을 삭제할까요?")) return;
    void runAction(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("couple_calendar_events")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      setNotice("일정을 삭제했습니다.");
      if (couple) await loadPrivateData(couple.couple_id);
    });
  };

  const leaveCoupleSpace = () => {
    const warning =
      couple?.member_count === 2
        ? "커플 공간에서 탈퇴하면 두 계정의 연결이 해제되고 공유 기념일과 일정이 모두 영구 삭제됩니다. 계속할까요?"
        : "커플 공간을 삭제하면 저장한 기념일과 일정, 초대 정보가 모두 영구 삭제됩니다. 계속할까요?";

    if (!window.confirm(warning)) return;

    const confirmation = window.prompt(
      "삭제를 확인하려면 아래 입력란에 '연결 해제'를 입력해 주세요."
    );
    if (confirmation?.trim() !== "연결 해제") {
      if (confirmation !== null) {
        setErrorMessage("확인 문구가 일치하지 않아 탈퇴를 취소했습니다.");
      }
      return;
    }

    void runAction(async () => {
      const response = await fetch("/api/couple/leave", {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.error ?? "커플 공간 연결을 해제하지 못했습니다."
        );
      }

      window.location.replace("/");
    });
  };

  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((item) => {
      const key = localDateKey(new Date(item.starts_at));
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return map;
  }, [events]);

  const sortedAnniversaries = useMemo(
    () =>
      [...anniversaries].sort(
        (a, b) => nextAnniversary(a).getTime() - nextAnniversary(b).getTime()
      ),
    [anniversaries]
  );

  if (loading) {
    return (
      <main className="couple-page">
        <div className="couple-loading">둘만의 공간을 안전하게 여는 중입니다.</div>
      </main>
    );
  }

  return (
    <main className="couple-page">
      <header className="couple-topbar">
        <Link className="couple-brand" href="/">
          <span>K</span>
          코리아픽
        </Link>
        <div className="couple-private-badge">🔒 두 사람만 볼 수 있어요</div>
      </header>

      <div className="couple-shell">
        <section className="couple-intro">
          <div>
            <p>PRIVATE COUPLE SPACE</p>
            <h1>
              우리 둘의
              <br />
              작은 기록
            </h1>
          </div>
          <p>
            기념일과 일정을 한곳에 모아 두 사람이 함께 관리하세요.
            데이터는 연결된 두 계정에만 열립니다.
          </p>
        </section>

        {errorMessage && <p className="couple-message is-error">{errorMessage}</p>}
        {notice && <p className="couple-message is-success">{notice}</p>}

        {!couple ? (
          <section className="couple-connect-grid">
            <form className="couple-connect-card is-create" onSubmit={createSpace}>
              <span>01</span>
              <h2>새 커플 공간 만들기</h2>
              <p>내 공간을 만들고 24시간 동안 유효한 초대 코드를 받아보세요.</p>
              <label>
                내 닉네임
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  maxLength={24}
                  placeholder="예: 민지"
                  required
                />
              </label>
              <button type="submit" disabled={working}>
                {working ? "처리 중" : "공간 만들기"}
              </button>
            </form>

            <form className="couple-connect-card is-join" onSubmit={joinSpace}>
              <span>02</span>
              <h2>초대 코드로 연결하기</h2>
              <p>상대방에게 받은 8자리 코드를 입력하면 바로 함께 사용할 수 있어요.</p>
              <label>
                내 닉네임
                <input
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  maxLength={24}
                  placeholder="예: 준호"
                  required
                />
              </label>
              <label>
                초대 코드
                <input
                  className="couple-code-input"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="A1B2C3D4"
                  required
                />
              </label>
              <button type="submit" disabled={working}>
                {working ? "연결 중" : "커플 연결하기"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="couple-status-card">
              <div className="couple-member-names">
                <span>{members[0]?.display_name ?? "나"}</span>
                <strong>♥</strong>
                <span>{members[1]?.display_name ?? "파트너 초대 전"}</span>
              </div>
              <div>
                <strong>{couple.member_count}/2 연결</strong>
                <small>커플 생성일 {new Date(couple.created_at).toLocaleDateString("ko-KR")}</small>
              </div>
            </section>

            {couple.member_role === "creator" && couple.member_count < 2 && (
              <section className="couple-invite-card">
                <div>
                  <p>PARTNER INVITATION</p>
                  <h2>상대방을 초대해 주세요</h2>
                  <span>코드는 한 번만 사용할 수 있고 24시간 후 자동 만료됩니다.</span>
                </div>
                {invite ? (
                  <div className="couple-invite-code">
                    <strong>{invite.invite_code}</strong>
                    <small>
                      {new Date(invite.invite_expires_at).toLocaleString("ko-KR")}까지
                    </small>
                    <button type="button" onClick={() => void copyInvite()}>
                      코드 복사
                    </button>
                  </div>
                ) : (
                  <button
                    className="couple-primary-button"
                    type="button"
                    onClick={refreshInvite}
                    disabled={working}
                  >
                    새 초대 코드 만들기
                  </button>
                )}
              </section>
            )}

            <section className="couple-dashboard">
              <div className="couple-calendar-card">
                <header className="couple-calendar-heading">
                  <div>
                    <p>SHARED CALENDAR</p>
                    <h2>
                      {visibleMonth.getFullYear()}년 {visibleMonth.getMonth() + 1}월
                    </h2>
                  </div>
                  <div>
                    <button
                      type="button"
                      aria-label="이전 달"
                      onClick={() =>
                        setVisibleMonth(
                          new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                        )
                      }
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleMonth(
                          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        )
                      }
                    >
                      오늘
                    </button>
                    <button
                      type="button"
                      aria-label="다음 달"
                      onClick={() =>
                        setVisibleMonth(
                          new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                        )
                      }
                    >
                      →
                    </button>
                  </div>
                </header>

                <div className="couple-calendar-weekdays">
                  {weekDays.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="couple-calendar-grid">
                  {cells.map((day) => {
                    const key = localDateKey(day);
                    const dayEvents = eventMap.get(key) ?? [];
                    const dayAnniversaries = anniversaries.filter((item) =>
                      anniversaryOccursOn(item, day)
                    );
                    const outside = day.getMonth() !== visibleMonth.getMonth();
                    const today = key === localDateKey(new Date());

                    return (
                      <div
                        className={[
                          "couple-calendar-day",
                          outside ? "is-outside" : "",
                          today ? "is-today" : "",
                        ].join(" ")}
                        key={key}
                      >
                        <span>{day.getDate()}</span>
                        <div>
                          {dayAnniversaries.map((item) => (
                            <small className="is-anniversary" key={item.id}>
                              ♥ {item.title}
                            </small>
                          ))}
                          {dayEvents.slice(0, 3).map((item) => (
                            <small className={"is-" + item.color} key={item.id}>
                              {item.title}
                            </small>
                          ))}
                          {dayEvents.length > 3 && (
                            <small className="is-more">+{dayEvents.length - 3}</small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="couple-anniversary-card">
                <p>ANNIVERSARIES</p>
                <h2>다가오는 기념일</h2>
                <div className="couple-anniversary-list">
                  {sortedAnniversaries.length === 0 && (
                    <span className="couple-empty">첫 기념일을 등록해 보세요.</span>
                  )}
                  {sortedAnniversaries.map((item) => (
                    <article key={item.id}>
                      <time dateTime={item.anniversary_date}>
                        {nextAnniversary(item).toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      <strong>{item.title}</strong>
                      {item.note && <p>{item.note}</p>}
                      <button type="button" onClick={() => removeAnniversary(item)}>
                        삭제
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            </section>

            <section className="couple-form-grid">
              <form className="couple-data-form" onSubmit={addCalendarEvent}>
                <header>
                  <span>CALENDAR</span>
                  <h2>일정 추가</h2>
                </header>
                <label>
                  일정 이름
                  <input
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                    maxLength={100}
                    required
                  />
                </label>
                <div className="couple-form-row">
                  <label>
                    날짜
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="couple-check-label">
                    <input
                      type="checkbox"
                      checked={eventAllDay}
                      onChange={(event) => setEventAllDay(event.target.checked)}
                    />
                    하루 종일
                  </label>
                </div>
                {!eventAllDay && (
                  <div className="couple-form-row">
                    <label>
                      시작
                      <input
                        type="time"
                        value={eventStartTime}
                        onChange={(event) => setEventStartTime(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      종료
                      <input
                        type="time"
                        value={eventEndTime}
                        onChange={(event) => setEventEndTime(event.target.value)}
                        required
                      />
                    </label>
                  </div>
                )}
                <label>
                  장소
                  <input
                    value={eventLocation}
                    onChange={(event) => setEventLocation(event.target.value)}
                    maxLength={160}
                    placeholder="선택 사항"
                  />
                </label>
                <label>
                  메모
                  <textarea
                    value={eventNote}
                    onChange={(event) => setEventNote(event.target.value)}
                    maxLength={1000}
                    placeholder="선택 사항"
                  />
                </label>
                <fieldset className="couple-color-field">
                  <legend>색상</legend>
                  {eventColors.map((color) => (
                    <label className={"is-" + color} key={color}>
                      <input
                        type="radio"
                        name="event-color"
                        value={color}
                        checked={eventColor === color}
                        onChange={() => setEventColor(color)}
                      />
                      <span />
                    </label>
                  ))}
                </fieldset>
                <button type="submit" disabled={working}>일정 저장</button>
              </form>

              <form className="couple-data-form is-anniversary" onSubmit={addAnniversary}>
                <header>
                  <span>ANNIVERSARY</span>
                  <h2>기념일 등록</h2>
                </header>
                <label>
                  기념일 이름
                  <input
                    value={anniversaryTitle}
                    onChange={(event) => setAnniversaryTitle(event.target.value)}
                    maxLength={80}
                    placeholder="예: 처음 만난 날"
                    required
                  />
                </label>
                <label>
                  날짜
                  <input
                    type="date"
                    value={anniversaryDate}
                    onChange={(event) => setAnniversaryDate(event.target.value)}
                    required
                  />
                </label>
                <label className="couple-check-label">
                  <input
                    type="checkbox"
                    checked={anniversaryRepeats}
                    onChange={(event) => setAnniversaryRepeats(event.target.checked)}
                  />
                  매년 반복
                </label>
                <label>
                  메모
                  <textarea
                    value={anniversaryNote}
                    onChange={(event) => setAnniversaryNote(event.target.value)}
                    maxLength={500}
                    placeholder="둘만의 짧은 메모"
                  />
                </label>
                <button type="submit" disabled={working}>기념일 저장</button>
              </form>
            </section>

            <section className="couple-event-list">
              <header>
                <p>UPCOMING PLANS</p>
                <h2>저장된 일정</h2>
              </header>
              <div>
                {events.length === 0 && (
                  <span className="couple-empty">아직 등록된 일정이 없습니다.</span>
                )}
                {events.map((item) => (
                  <article key={item.id}>
                    <i className={"is-" + item.color} />
                    <time dateTime={item.starts_at}>
                      {new Date(item.starts_at).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: item.all_day ? undefined : "2-digit",
                        minute: item.all_day ? undefined : "2-digit",
                      })}
                    </time>
                    <strong>{item.title}</strong>
                    {item.location && <span>{item.location}</span>}
                    <button type="button" onClick={() => removeEvent(item)}>삭제</button>
                  </article>
                ))}
              </div>
            </section>

            <section className="couple-danger-zone">
              <div>
                <p>PRIVATE SPACE SETTINGS</p>
                <h2>커플 공간 연결 해제</h2>
                <span>
                  두 계정의 연결과 공유 기념일·일정·초대 정보가 모두 영구
                  삭제됩니다. 코리아픽 계정과 로그인 정보는 삭제되지 않습니다.
                </span>
              </div>
              <button
                type="button"
                onClick={leaveCoupleSpace}
                disabled={working}
              >
                {working ? "처리 중" : "커플 공간 탈퇴"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
