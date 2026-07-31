"use client";

import { useState } from "react";
import { springApiUrl } from "@/utils/spring-api";

const categories = [
  ["privacy", "개인정보 권리 행사"],
  ["account-deletion", "로그인 불가 계정 삭제"],
  ["copyright", "저작권·출처 신고"],
  ["service", "서비스 이용 문의"],
] as const;

export default function SupportPage() {
  const [category, setCategory] = useState("service");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted || sending) return;
    setSending(true);
    setResult("");
    try {
      const response = await fetch(`${springApiUrl}/api/public/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, email, message }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        requestId?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error || "문의를 접수하지 못했습니다.");
      setResult(`접수되었습니다. 접수번호: ${payload?.requestId ?? "확인 중"}`);
      setMessage("");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "문의 접수 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="legal-page">
      <article className="legal-shell">
        <header className="legal-header">
          <a href="/">← 코리아픽 홈</a>
          <small>PRIVATE SUPPORT</small>
          <h1>고객지원</h1>
          <p>개인정보가 공개되지 않는 내부 접수 채널입니다.</p>
        </header>
        <div className="legal-content">
          <form className="support-form" onSubmit={submit}>
            <label>
              <span>문의 유형</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>답변받을 이메일</span>
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              <span>문의 내용</span>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="계정 삭제 요청은 사용한 소셜 제공자와 확인 가능한 계정 정보를 적어 주세요. 비밀번호나 인증번호는 보내지 마세요."
              />
            </label>
            <label className="login-consent">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>문의 처리와 답변을 위해 이메일과 문의 내용을 수집하며, 종결일부터 1년간 보관하는 데 동의합니다.</span>
            </label>
            <button className="support-submit" type="submit" disabled={!accepted || sending}>
              {sending ? "접수 중..." : "비공개 문의 접수"}
            </button>
            {result && <p className="legal-note" role="status">{result}</p>}
          </form>
        </div>
      </article>
    </main>
  );
}
