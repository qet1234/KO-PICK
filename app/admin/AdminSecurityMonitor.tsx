"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./AdminSecurityMonitor.module.css";

type SecurityCheckStatus = "ok" | "warning" | "off";
type SecurityOverall = "healthy" | "warning" | "disabled";

type SecurityCheck = {
  description: string;
  detail: string;
  id: string;
  label: string;
  status: SecurityCheckStatus;
};

type SecurityStatus = {
  checkedAt: string;
  checks: SecurityCheck[];
  managementEnabled: boolean;
  overall: SecurityOverall;
};

const statusLabels: Record<SecurityCheckStatus, string> = {
  off: "관리 중지",
  ok: "정상",
  warning: "확인 필요",
};

const overallLabels: Record<SecurityOverall, string> = {
  disabled: "보안 관리 중지",
  healthy: "보안 상태 정상",
  warning: "보안 확인 필요",
};

const securityHeaderNames = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
] as const;

function formatCheckedAt(value: string | null) {
  if (!value) return "확인 전";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "확인 전";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function AdminSecurityMonitor() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/security-status", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = await response.json() as SecurityStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || "보안 상태를 확인하지 못했습니다.");

      const appliedHeaders = securityHeaderNames.filter((header) => response.headers.has(header));
      const headerCheck: SecurityCheck = {
        description: "CSP·HSTS·MIME 스니핑 방지·프레임 차단 헤더가 현재 관리자 API 응답에 적용되는지 확인합니다.",
        detail: `${appliedHeaders.length}/${securityHeaderNames.length}개 핵심 보안 헤더 적용`,
        id: "security_headers",
        label: "보안 응답 헤더",
        status: appliedHeaders.length === securityHeaderNames.length ? "ok" : "warning",
      };
      const checks = [...payload.checks.filter((check) => check.id !== "security_headers"), headerCheck];
      const hasWarning = checks.some((check) => check.status === "warning");

      setStatus({
        ...payload,
        checks,
        overall: payload.managementEnabled ? (hasWarning ? "warning" : "healthy") : "disabled",
      });
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "보안 상태를 확인하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 10_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const toggleManagement = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/security-status", {
        body: JSON.stringify({ enabled }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "보안 관리 상태를 저장하지 못했습니다.");
      setStatus((current) => current ? {
        ...current,
        managementEnabled: enabled,
        overall: enabled ? (current.checks.some((check) => check.status === "warning") ? "warning" : "healthy") : "disabled",
        checks: current.checks.map((check) => check.id === "management"
          ? { ...check, detail: enabled ? "보안 관리 활성" : "보안 관리 비활성", status: enabled ? "ok" : "off" }
          : check),
      } : current);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "보안 관리 상태를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const warningCount = useMemo(
    () => status?.checks.filter((check) => check.status === "warning").length ?? 0,
    [status],
  );

  const overall = status?.overall ?? "warning";

  return (
    <section className={styles.securityPanel} id="security-monitor">
      <div className={styles.heading}>
        <div>
          <span>SECURITY CONTROL</span>
          <h3>보안 관리·실시간 상태</h3>
          <p>관리자 접근, HTTPS, 운영 DB, 서버 비밀키, 보안 응답 헤더를 10초마다 자동 확인합니다.</p>
        </div>
        <div className={`${styles.overallBadge} ${styles[overall]}`} aria-live="polite">
          <i aria-hidden="true" />
          {loading && !status ? "확인 중" : overallLabels[overall]}
        </div>
      </div>

      <div className={styles.managementRow}>
        <div>
          <strong>보안 관리 수행 여부</strong>
          <small>OFF로 바꿔도 인증·RLS·CSP·HSTS 등 실제 보호 기능은 계속 유지됩니다.</small>
        </div>
        <label className={styles.switch}>
          <input
            checked={status?.managementEnabled ?? true}
            disabled={saving || !status}
            onChange={(event) => void toggleManagement(event.target.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" />
          <b>{status?.managementEnabled === false ? "관리 중지" : "관리 중"}</b>
        </label>
      </div>

      <div className={styles.summaryRow}>
        <span>마지막 확인 <strong>{formatCheckedAt(status?.checkedAt ?? null)}</strong></span>
        <span>확인 필요 <strong>{warningCount}건</strong></span>
        <button disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? "확인 중..." : "지금 재확인"}
        </button>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.checkGrid}>
        {(status?.checks ?? []).map((check) => (
          <article className={`${styles.checkCard} ${styles[check.status]}`} key={check.id}>
            <div>
              <i aria-hidden="true" />
              <span>{statusLabels[check.status]}</span>
            </div>
            <strong>{check.label}</strong>
            <p>{check.description}</p>
            <small>{check.detail}</small>
          </article>
        ))}
        {!status && !error ? (
          <article className={styles.loadingCard}>
            <strong>보안 상태 확인 중</strong>
            <p>현재 운영 환경의 보호 상태를 불러오고 있습니다.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
