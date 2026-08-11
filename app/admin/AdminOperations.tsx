"use client";

import { useState } from "react";

export type OperationsSummary = {
  searchNoResults: number;
  placeClicks: number;
  appErrors: number;
  appCrashes: number;
  slowApiCount: number;
  apiErrorCount: number;
  conversions: {
    map: { count: number; rate: number };
    directions: { count: number; rate: number };
    booking: { count: number; rate: number };
  };
  slowApis: Array<{ route: string; requests: number; avg_ms: number; p95_ms: number; errors: number }>;
  noResultQueries: Array<{ feature: string; route: string; count: number }>;
  recentErrors: Array<{ platform: string; feature: string; route: string | null; error_message: string | null; status_code: number | null; created_at: string }>;
};

export type PlaceReport = {
  id: string;
  place_id: string;
  place_name: string;
  category: string | null;
  address: string | null;
  reason: string;
  details: string | null;
  platform: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
};

const reportReason: Record<string, string> = {
  closed: "폐업·없어진 장소",
  duplicate: "중복 장소",
  incorrect_info: "장소 정보 오류",
  other: "기타",
  wrong_location: "위치·주소 오류",
};

function number(value: number) {
  return Number(value || 0).toLocaleString("ko-KR");
}

export function AdminOperationsDashboard({ summary }: { summary: OperationsSummary }) {
  const conversions = [
    ["지도 열기", summary.conversions.map],
    ["길찾기", summary.conversions.directions],
    ["예약", summary.conversions.booking],
  ] as const;

  return (
    <section id="operations">
      <div className="admin-section-heading operations-heading">
        <div><span className="admin-kicker">PRODUCT OPERATIONS</span><h2>기능 운영 지표</h2><p>최근 30일 사용자 행동, 오류와 API 성능입니다.</p></div>
      </div>
      <div className="metric-grid operations-metrics">
        <article className="metric-card is-red"><small>검색 결과 없음</small><strong>{number(summary.searchNoResults)}</strong><span>필터·데이터 보완 후보</span></article>
        <article className="metric-card"><small>장소 카드 클릭</small><strong>{number(summary.placeClicks)}</strong><span>상세 관심 행동</span></article>
        <article className="metric-card is-dark"><small>느린 API</small><strong>{number(summary.slowApiCount)}</strong><span>1.5초 이상 · 오류 {number(summary.apiErrorCount)}건</span></article>
        <article className="metric-card is-lime"><small>앱 오류·강제 종료</small><strong>{number(summary.appErrors + summary.appCrashes)}</strong><span>강제 종료 {number(summary.appCrashes)}건</span></article>
      </div>

      <div className="operations-grid">
        <article className="admin-panel conversion-panel">
          <div className="panel-title"><div><h2>장소 카드 전환율</h2><p>장소 카드 클릭 대비 외부 행동</p></div><span>CONVERSION</span></div>
          <div className="conversion-list">
            {conversions.map(([label, item]) => (
              <div key={label}><p><strong>{label}</strong><span>{number(item.count)}회 · {item.rate}%</span></p><i><b style={{ width: `${Math.min(100, item.rate)}%` }} /></i></div>
            ))}
          </div>
        </article>
        <article className="admin-panel slow-api-panel">
          <div className="panel-title"><div><h2>느린 API</h2><p>응답시간 P95 기준</p></div><span>PERFORMANCE</span></div>
          <div className="operations-table">
            {summary.slowApis.map((item) => <div key={item.route}><strong>{item.route}</strong><span>평균 {number(item.avg_ms)}ms</span><b>P95 {number(item.p95_ms)}ms</b><small>{number(item.requests)}회 · 오류 {number(item.errors)}</small></div>)}
            {summary.slowApis.length === 0 ? <p className="chart-empty">수집된 API 성능 정보가 없습니다.</p> : null}
          </div>
        </article>
      </div>

      <div className="operations-grid">
        <article className="admin-panel">
          <div className="panel-title"><div><h2>결과 없는 검색</h2><p>빈 결과가 반복된 조건</p></div></div>
          <div className="operations-table compact">
            {summary.noResultQueries.map((item, index) => <div key={`${item.feature}-${item.route}`}><em>{index + 1}</em><strong>{item.route}</strong><span>{item.feature}</span><b>{number(item.count)}회</b></div>)}
            {summary.noResultQueries.length === 0 ? <p className="chart-empty">결과 없는 검색 기록이 없습니다.</p> : null}
          </div>
        </article>
        <article className="admin-panel">
          <div className="panel-title"><div><h2>최근 앱 오류</h2><p>웹·Android·iOS 런타임 오류</p></div></div>
          <div className="error-list">
            {summary.recentErrors.map((item, index) => <div key={`${item.created_at}-${index}`}><span>{item.platform.toUpperCase()}</span><strong>{item.error_message || "오류 메시지 없음"}</strong><small>{item.feature} · {new Date(item.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small></div>)}
            {summary.recentErrors.length === 0 ? <p className="chart-empty">수집된 앱 오류가 없습니다.</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}

export function AdminPlaceReports({ initialReports }: { initialReports: PlaceReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [saving, setSaving] = useState<string | null>(null);

  const changeStatus = async (id: string, status: PlaceReport["status"]) => {
    setSaving(id);
    try {
      const response = await fetch(`/api/admin/place-reports/${id}`, {
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error();
      setReports((current) => current.map((report) => report.id === id ? { ...report, status } : report));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="admin-panel reports-panel" id="reports">
      <div className="admin-section-heading"><div><span className="admin-kicker">PLACE REPORTS</span><h2>잘못된 장소 정보 신고</h2><p>사용자 신고를 검토하고 처리 상태를 관리합니다.</p></div><strong className="admin-count">미처리 {reports.filter((item) => item.status === "open").length}</strong></div>
      <div className="reports-list">
        {reports.map((report) => (
          <article key={report.id}>
            <div><span>{reportReason[report.reason] ?? report.reason}</span><strong>{report.place_name}</strong><p>{report.address || "주소 없음"}</p><small>{report.details || "추가 설명 없음"} · {report.platform.toUpperCase()} · {new Date(report.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</small></div>
            <select disabled={saving === report.id} onChange={(event) => void changeStatus(report.id, event.target.value as PlaceReport["status"])} value={report.status}>
              <option value="open">접수</option><option value="reviewing">검토 중</option><option value="resolved">수정 완료</option><option value="dismissed">반려</option>
            </select>
          </article>
        ))}
        {reports.length === 0 ? <p className="chart-empty">접수된 장소 신고가 없습니다.</p> : null}
      </div>
    </section>
  );
}
