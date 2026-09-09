"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOrCreatePollVoterToken,
  getSharedPlacePoll,
  voteSharedPlacePoll,
  type SharedPlacePoll,
} from "@/utils/place-polls";
import { naverMapSearchUrl } from "@/utils/naver-maps";

export default function SharedPlacePollView({ token }: { token: string }) {
  const [poll, setPoll] = useState<SharedPlacePoll | null>(null);
  const voterTokenRef = useRef("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const loadPoll = useCallback(async (identity: string) => {
    setError("");
    try {
      setPoll(await getSharedPlacePoll(token, identity));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "투표를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const identity = getOrCreatePollVoterToken();
    voterTokenRef.current = identity;
    const storedName = window.localStorage.getItem("todaywhere:poll-name:v1") ?? "";
    queueMicrotask(() => {
      setDisplayName(storedName);
      void loadPoll(identity);
    });
  }, [loadPoll]);

  const vote = async (candidateId: string) => {
    if (!displayName.trim()) {
      setError("투표에 표시할 이름을 입력해 주세요.");
      return;
    }
    setWorkingId(candidateId);
    setError("");
    try {
      window.localStorage.setItem("todaywhere:poll-name:v1", displayName.trim());
      await voteSharedPlacePoll(token, candidateId, voterTokenRef.current, displayName.trim());
      await loadPoll(voterTokenRef.current);
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "투표하지 못했습니다.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <main className="shared-poll-page">
      <header className="shared-poll-header"><a href="/">오늘어디</a><span>함께 고르기</span></header>
      <section className="shared-poll-shell">
        {loading ? (
          <p className="shared-poll-state">투표를 불러오는 중입니다.</p>
        ) : error && !poll ? (
          <div className="shared-poll-error"><strong>링크를 확인해 주세요.</strong><p>{error}</p></div>
        ) : poll ? (
          <>
            <div className="shared-poll-title">
              <small>CHOOSE TOGETHER</small>
              <h1>{poll.title}</h1>
              <p>{poll.status === "open" ? "가장 가고 싶은 장소 한 곳을 선택해 주세요." : "마감된 투표입니다. 결과를 확인해 주세요."}</p>
            </div>

            {poll.status === "open" && (
              <label className="shared-poll-name">
                <span>투표에 표시할 이름</span>
                <input value={displayName} maxLength={20} placeholder="예: 종선" onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            )}

            {error && <p className="shared-poll-inline-error" aria-live="polite">{error}</p>}

            <div className="shared-poll-candidates">
              {poll.candidates.map((candidate) => (
                <article className={`shared-poll-card${candidate.votedByMe ? " is-voted" : ""}`} key={candidate.id}>
                  <div className="shared-poll-rank"><span>{String(candidate.position).padStart(2, "0")}</span><strong>{candidate.voteCount}표</strong></div>
                  <div className="shared-poll-copy"><small>{candidate.category}</small><h2>{candidate.placeName}</h2><p>{candidate.address ?? "주소 정보 없음"}</p></div>
                  <div className="shared-poll-actions">
                    <a href={naverMapSearchUrl(candidate.placeName, candidate.address, candidate.latitude, candidate.longitude)} target="_blank" rel="noopener noreferrer">지도에서 확인 ↗</a>
                    {poll.status === "open" && <button type="button" disabled={Boolean(workingId)} onClick={() => void vote(candidate.id)}>{workingId === candidate.id ? "처리 중" : candidate.votedByMe ? "내 투표 취소" : "이 장소에 투표"}</button>}
                  </div>
                </article>
              ))}
            </div>
            <footer className="shared-poll-footer">로그인한 계정당 한 곳에 투표할 수 있으며, 다른 장소를 누르면 선택이 변경됩니다. <a href={`/login?next=${encodeURIComponent(`/choose/${token}`)}`}>로그인하기</a></footer>
          </>
        ) : null}
      </section>
    </main>
  );
}
