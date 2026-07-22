"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, springJson } from "@/utils/spring-api";

type SpaceType = "personal" | "couple" | "friends" | "family";

type SpaceSummary = {
  id: string;
  space_type: SpaceType;
  name: string;
  member_role: "owner" | "member";
  member_count: number;
  invite_expires_at: string | null;
  created_at: string;
  legacy_couple: boolean;
};

type SpacesPayload = {
  user_id: string;
  spaces: SpaceSummary[];
};

type InviteResult = {
  space_id?: string;
  invite_code: string;
  invite_expires_at: string;
};

const spaceTypes: Record<
  SpaceType,
  { label: string; icon: string; eyebrow: string; description: string; example: string; limit: number }
> = {
  personal: {
    label: "개인",
    icon: "✦",
    eyebrow: "FOR ME",
    description: "혼밥·혼카페·혼행 장소와 나만의 일정을 모아요.",
    example: "취향 기록 · 개인 일정",
    limit: 1,
  },
  couple: {
    label: "커플",
    icon: "♥",
    eyebrow: "TOGETHER",
    description: "데이트 장소를 함께 고르고 기념일과 예약을 공유해요.",
    example: "데이트 · 기념일",
    limit: 2,
  },
  friends: {
    label: "친구",
    icon: "♣",
    eyebrow: "WITH FRIENDS",
    description: "후보 장소를 제안하고 모임과 여행 일정을 맞춰요.",
    example: "모임 · 여행 · 투표",
    limit: 20,
  },
  family: {
    label: "가족",
    icon: "⌂",
    eyebrow: "WITH FAMILY",
    description: "가족 구성원 조건에 맞는 외식과 나들이를 계획해요.",
    example: "외식 · 나들이 · 여행",
    limit: 20,
  },
};

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export default function SpacesHub() {
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedType, setSelectedType] = useState<SpaceType>("couple");
  const [spaceName, setSpaceName] = useState("우리의 공간");
  const [displayName, setDisplayName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [invite, setInvite] = useState<InviteResult | null>(null);

  const loadSpaces = useCallback(async () => {
    try {
      const result = await springJson<SpacesPayload>("/api/web/spaces");
      setSpaces(result.spaces);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message.includes("로그인")) {
        window.location.replace("/login");
        return;
      }
      throw loadError;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const user = await getCurrentUser();
          if (!user) {
            window.location.replace("/login");
            return;
          }
          await loadSpaces();
        } catch (loadError) {
          if (active) setError(messageFrom(loadError, "공간을 불러오지 못했습니다."));
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadSpaces]);

  const groupedSpaces = useMemo(
    () =>
      (["personal", "couple", "friends", "family"] as SpaceType[]).flatMap((type) =>
        spaces.filter((space) => space.space_type === type)
      ),
    [spaces]
  );

  const selectType = (type: SpaceType) => {
    setError("");
    setNotice("");
    if (type === "personal") {
      document.getElementById("my-spaces")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSelectedType(type);
    const defaults: Record<Exclude<SpaceType, "personal">, string> = {
      couple: "우리의 공간",
      friends: "친구 모임",
      family: "우리 가족",
    };
    setSpaceName(defaults[type]);
    document.getElementById("create-space")?.scrollIntoView({ behavior: "smooth" });
  };

  const run = async (action: () => Promise<void>) => {
    if (working) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (actionError) {
      setError(messageFrom(actionError, "처리 중 오류가 발생했습니다."));
    } finally {
      setWorking(false);
    }
  };

  const createSpace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      if (selectedType === "personal") throw new Error("개인 공간은 자동으로 만들어집니다.");
      const result = await springJson<InviteResult>("/api/web/spaces", {
        method: "POST",
        body: JSON.stringify({
          type: selectedType,
          name: spaceName.trim(),
          displayName: displayName.trim(),
        }),
      });
      setInvite(result);
      setNotice(`${spaceTypes[selectedType].label} 공간을 만들었습니다. 초대 코드를 공유해 주세요.`);
      await loadSpaces();
    });
  };

  const joinSpace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      await springJson<{ space_id: string }>("/api/web/spaces/join", {
        method: "POST",
        body: JSON.stringify({
          inviteCode: joinCode.replace(/\s+/g, "").toUpperCase(),
          displayName: joinName.trim(),
        }),
      });
      setJoinCode("");
      setNotice("초대받은 공간에 참여했습니다.");
      await loadSpaces();
    });
  };

  const refreshInvite = (space: SpaceSummary) => {
    void run(async () => {
      const result = await springJson<InviteResult>(
        `/api/web/spaces/${encodeURIComponent(space.id)}/invite`,
        { method: "POST" }
      );
      setInvite({ ...result, space_id: space.id });
      setNotice(`‘${space.name}’의 새 초대 코드를 만들었습니다.`);
    });
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invite_code);
      setNotice("초대 코드를 복사했습니다.");
    } catch {
      setError("복사하지 못했습니다. 초대 코드를 직접 선택해 주세요.");
    }
  };

  const leaveSpace = (space: SpaceSummary) => {
    const verb = space.member_role === "owner" ? "삭제" : "탈퇴";
    const warning =
      space.member_role === "owner"
        ? `‘${space.name}’을 삭제하면 모든 구성원의 공유 데이터가 삭제됩니다. 계속할까요?`
        : `‘${space.name}’에서 탈퇴할까요?`;
    if (!window.confirm(warning)) return;

    void run(async () => {
      await springJson<{ success: boolean }>(`/api/web/spaces/${encodeURIComponent(space.id)}`, {
        method: "DELETE",
      });
      setNotice(`공간 ${verb}가 완료되었습니다.`);
      if (invite?.space_id === space.id) setInvite(null);
      await loadSpaces();
    });
  };

  if (loading) {
    return <main className="spaces-loading">나에게 맞는 공간을 준비하는 중입니다.</main>;
  }

  return (
    <main className="spaces-page">
      <header className="spaces-topbar">
        <a className="spaces-brand" href="/">
          <span>K</span>
          코리아픽
        </a>
        <a className="spaces-home-link" href="/">홈으로</a>
      </header>

      <div className="spaces-shell">
        <section className="spaces-hero">
          <p>PLAN TOGETHER</p>
          <h1>누구와<br />함께할까요?</h1>
          <span>관계와 목적에 맞는 공간에서 장소를 고르고 하루를 함께 계획하세요.</span>
        </section>

        {error && <p className="spaces-message is-error">{error}</p>}
        {notice && <p className="spaces-message is-success">{notice}</p>}

        <section className="spaces-type-grid" aria-label="공간 유형 선택">
          {(Object.keys(spaceTypes) as SpaceType[]).map((type) => {
            const info = spaceTypes[type];
            return (
              <button
                className={`spaces-type-card is-${type}`}
                type="button"
                key={type}
                onClick={() => selectType(type)}
              >
                <span className="spaces-type-icon" aria-hidden="true">{info.icon}</span>
                <small>{info.eyebrow}</small>
                <strong>{info.label}</strong>
                <p>{info.description}</p>
                <span className="spaces-type-example">{info.example}</span>
                <i aria-hidden="true">→</i>
              </button>
            );
          })}
        </section>

        <section className="spaces-section" id="my-spaces">
          <div className="spaces-section-heading">
            <div>
              <p>MY SPACES</p>
              <h2>내 공간</h2>
            </div>
            <span>{groupedSpaces.length}개 공간</span>
          </div>

          <div className="spaces-list">
            {groupedSpaces.map((space) => {
              const info = spaceTypes[space.space_type];
              const currentInvite = invite?.space_id === space.id ? invite : null;
              return (
                <article className={`spaces-list-card is-${space.space_type}`} key={space.id}>
                  <div className="spaces-list-icon" aria-hidden="true">{info.icon}</div>
                  <div className="spaces-list-main">
                    <span>{info.label} 공간</span>
                    <h3>{space.name}</h3>
                    <p>
                      {space.member_count}/{info.limit}명 · {space.member_role === "owner" ? "내가 만든 공간" : "참여 중"}
                    </p>
                  </div>
                  <div className="spaces-list-actions">
                    {space.legacy_couple ? (
                      <a href="/couple">기존 커플 공간 열기</a>
                    ) : space.space_type === "personal" ? (
                      <button type="button" disabled>기본 공간</button>
                    ) : (
                      <>
                        {space.member_role === "owner" && space.member_count < info.limit && (
                          <button type="button" onClick={() => refreshInvite(space)} disabled={working}>
                            초대 코드
                          </button>
                        )}
                        <button className="is-danger" type="button" onClick={() => leaveSpace(space)} disabled={working}>
                          {space.member_role === "owner" ? "삭제" : "탈퇴"}
                        </button>
                      </>
                    )}
                  </div>
                  {currentInvite && (
                    <div className="spaces-inline-invite">
                      <code>{currentInvite.invite_code}</code>
                      <span>{new Date(currentInvite.invite_expires_at).toLocaleString("ko-KR")}까지</span>
                      <button type="button" onClick={() => void copyInvite()}>복사</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="spaces-action-grid">
          <form className="spaces-form" id="create-space" onSubmit={createSpace}>
            <header>
              <span>01 · CREATE</span>
              <h2>{spaceTypes[selectedType].label} 공간 만들기</h2>
              <p>공간을 만든 뒤 24시간 동안 유효한 초대 코드를 받을 수 있어요.</p>
            </header>
            <div className="spaces-segmented" aria-label="만들 공간 유형">
              {(["couple", "friends", "family"] as SpaceType[]).map((type) => (
                <button
                  className={selectedType === type ? "is-active" : ""}
                  type="button"
                  key={type}
                  onClick={() => selectType(type)}
                >
                  {spaceTypes[type].label}
                </button>
              ))}
            </div>
            <label>
              공간 이름
              <input value={spaceName} onChange={(event) => setSpaceName(event.target.value)} maxLength={80} required />
            </label>
            <label>
              이 공간에서 사용할 내 닉네임
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} placeholder="예: 종선" required />
            </label>
            <button className="spaces-submit" type="submit" disabled={working}>
              {working ? "처리 중" : "공간 만들기"}
            </button>
          </form>

          <form className="spaces-form is-join" onSubmit={joinSpace}>
            <header>
              <span>02 · JOIN</span>
              <h2>초대받은 공간 참여</h2>
              <p>커플·친구·가족에게 받은 초대 코드로 안전하게 연결하세요.</p>
            </header>
            <label>
              이 공간에서 사용할 내 닉네임
              <input value={joinName} onChange={(event) => setJoinName(event.target.value)} maxLength={24} placeholder="예: 종선" required />
            </label>
            <label>
              초대 코드
              <input
                className="spaces-code-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                maxLength={32}
                placeholder="32자리 코드"
                required
              />
            </label>
            <button className="spaces-submit" type="submit" disabled={working}>
              {working ? "연결 중" : "공간 참여하기"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
