import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAccounts, { type AdminAccount } from "./AdminAccounts";
import AdminServiceControl from "./AdminServiceControl";
import { createAdminClient, getAdminAccess } from "@/utils/admin";
import { defaultAppServiceStatus, normalizeAppServiceStatus } from "@/utils/app-service-status";
import "./admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "운영 관리자 | 오늘어디",
  robots: { follow: false, index: false },
};

type DailyTraffic = { date: string; views: number; visitors: number };
type TopPage = { path: string; views: number; visitors: number };
type DeviceTraffic = { device: string; views: number };
type TrafficSummary = {
  authenticatedViews30d: number;
  daily: DailyTraffic[];
  devices: DeviceTraffic[];
  todayViews: number;
  todayVisitors: number;
  topPages: TopPage[];
  views7d: number;
  views30d: number;
  visitors7d: number;
  visitors30d: number;
};

const emptyTraffic: TrafficSummary = {
  authenticatedViews30d: 0,
  daily: [],
  devices: [],
  todayViews: 0,
  todayVisitors: 0,
  topPages: [],
  views7d: 0,
  views30d: 0,
  visitors7d: 0,
  visitors30d: 0,
};

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function trafficSummary(value: unknown): TrafficSummary {
  if (!value || typeof value !== "object") return emptyTraffic;
  const data = value as Record<string, unknown>;
  return {
    authenticatedViews30d: number(data.authenticatedViews30d),
    daily: Array.isArray(data.daily) ? data.daily as DailyTraffic[] : [],
    devices: Array.isArray(data.devices) ? data.devices as DeviceTraffic[] : [],
    todayViews: number(data.todayViews),
    todayVisitors: number(data.todayVisitors),
    topPages: Array.isArray(data.topPages) ? data.topPages as TopPage[] : [],
    views7d: number(data.views7d),
    views30d: number(data.views30d),
    visitors7d: number(data.visitors7d),
    visitors30d: number(data.visitors30d),
  };
}

function providers(user: { app_metadata?: Record<string, unknown> }) {
  const raw = user.app_metadata?.providers;
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");
  const provider = user.app_metadata?.provider;
  return typeof provider === "string" ? [provider] : ["email"];
}

function accountStatus(user: { banned_until?: string | null; email_confirmed_at?: string | null }) {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) return "banned" as const;
  if (!user.email_confirmed_at) return "unconfirmed" as const;
  return "active" as const;
}

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access.user) redirect("/login?next=/admin");

  if (!access.authorized) {
    return (
      <main className="admin-denied">
        <div>
          <span>ADMIN ONLY</span>
          <h1>관리자 권한이 없습니다</h1>
          <p>{access.user.email ?? "현재 계정"}은 운영자로 등록되지 않았습니다.</p>
          <Link href="/">서비스로 돌아가기</Link>
        </div>
      </main>
    );
  }

  const adminClient = createAdminClient();
  const [usersResult, trafficResult, serviceStatusResult] = await Promise.all([
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    adminClient.rpc("get_admin_traffic_dashboard", { p_days: 30 }),
    adminClient.from("app_service_status").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (usersResult.error) console.error("관리자 계정 목록 오류:", usersResult.error.message);
  if (trafficResult.error) console.error("관리자 트래픽 요약 오류:", trafficResult.error.message);
  if (serviceStatusResult.error) console.error("앱 서비스 상태 오류:", serviceStatusResult.error.message);

  const accounts: AdminAccount[] = (usersResult.data?.users ?? []).map((user) => ({
    createdAt: user.created_at,
    email: user.email ?? "이메일 없음",
    id: user.id,
    lastSignInAt: user.last_sign_in_at ?? null,
    name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "이름 없음"),
    providers: providers(user),
    status: accountStatus(user),
  }));
  const traffic = trafficSummary(trafficResult.data);
  const serviceStatus = serviceStatusResult.data
    ? normalizeAppServiceStatus(serviceStatusResult.data)
    : defaultAppServiceStatus;
  const maxDailyViews = Math.max(1, ...traffic.daily.map((day) => number(day.views)));
  const totalDeviceViews = Math.max(1, traffic.devices.reduce((sum, item) => sum + number(item.views), 0));
  const loginRatio = traffic.views30d
    ? Math.round((traffic.authenticatedViews30d / traffic.views30d) * 100)
    : 0;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <Image src="/brand-mark.svg" alt="" width={42} height={42} priority />
          <span><strong>오늘어디</strong><small>OPERATOR</small></span>
        </Link>
        <nav aria-label="관리자 메뉴">
          <a href="#service-control"><span>01</span>앱 운영 제어</a>
          <a href="#traffic"><span>02</span>트래픽 현황</a>
          <a href="#accounts"><span>03</span>로그인 계정</a>
        </nav>
        <div className="admin-sidebar-bottom">
          <small>접속 계정</small>
          <strong>{access.user.email}</strong>
          <Link href="/">서비스 화면 보기</Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">SERVICE CONTROL</span>
            <h1>운영 현황</h1>
            <p>앱 점검 상태, 트래픽과 로그인 계정을 한곳에서 관리하세요.</p>
          </div>
          <div className="admin-live"><i />실시간 수집 중</div>
        </header>

        <AdminServiceControl initialStatus={serviceStatus} />

        <section id="traffic">
          <div className="metric-grid">
            <article className="metric-card is-red">
              <small>오늘 페이지 조회</small>
              <strong>{traffic.todayViews.toLocaleString("ko-KR")}</strong>
              <span>순방문자 {traffic.todayVisitors.toLocaleString("ko-KR")}명</span>
            </article>
            <article className="metric-card">
              <small>최근 7일 조회</small>
              <strong>{traffic.views7d.toLocaleString("ko-KR")}</strong>
              <span>순방문자 {traffic.visitors7d.toLocaleString("ko-KR")}명</span>
            </article>
            <article className="metric-card is-dark">
              <small>최근 30일 조회</small>
              <strong>{traffic.views30d.toLocaleString("ko-KR")}</strong>
              <span>순방문자 {traffic.visitors30d.toLocaleString("ko-KR")}명</span>
            </article>
            <article className="metric-card is-lime">
              <small>로그인 방문 비율</small>
              <strong>{loginRatio}%</strong>
              <span>30일 페이지 조회 기준</span>
            </article>
          </div>

          <div className="traffic-grid">
            <article className="admin-panel traffic-chart-panel">
              <div className="panel-title">
                <div><h2>14일 방문 추이</h2><p>한국 시간 기준 일별 페이지 조회</p></div>
                <span>PAGE VIEWS</span>
              </div>
              <div className="bar-chart" aria-label="14일 페이지 조회 막대그래프">
                {traffic.daily.map((day) => (
                  <div className="bar-column" key={day.date} title={`${day.date}: ${day.views}회`}>
                    <strong>{number(day.views) || ""}</strong>
                    <div><i style={{ height: `${Math.max(4, (number(day.views) / maxDailyViews) * 100)}%` }} /></div>
                    <small>{day.date.slice(5).replace("-", "/")}</small>
                  </div>
                ))}
                {traffic.daily.length === 0 ? <p className="chart-empty">수집된 트래픽이 없습니다.</p> : null}
              </div>
            </article>

            <article className="admin-panel device-panel">
              <div className="panel-title">
                <div><h2>기기 비율</h2><p>최근 30일</p></div>
              </div>
              <div className="device-list">
                {traffic.devices.map((item) => {
                  const percentage = Math.round((number(item.views) / totalDeviceViews) * 100);
                  return (
                    <div key={item.device}>
                      <p><strong>{item.device.toUpperCase()}</strong><span>{percentage}%</span></p>
                      <i><b style={{ width: `${percentage}%` }} /></i>
                    </div>
                  );
                })}
                {traffic.devices.length === 0 ? <p className="chart-empty">수집된 기기 정보가 없습니다.</p> : null}
              </div>
            </article>
          </div>

          <article className="admin-panel top-pages-panel">
            <div className="panel-title">
              <div><h2>인기 페이지</h2><p>최근 30일 조회 기준</p></div>
            </div>
            <div className="top-pages-list">
              {traffic.topPages.map((page, index) => (
                <div key={page.path}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{page.path}</strong>
                  <small>방문자 {number(page.visitors).toLocaleString("ko-KR")}명</small>
                  <b>{number(page.views).toLocaleString("ko-KR")}회</b>
                </div>
              ))}
              {traffic.topPages.length === 0 ? <p className="chart-empty">수집된 페이지 정보가 없습니다.</p> : null}
            </div>
          </article>
        </section>

        <AdminAccounts accounts={accounts} />
        <p className="admin-privacy-note">IP 주소와 정밀 위치는 저장하지 않으며, 익명 트래픽 기록은 90일 후 자동 삭제됩니다.</p>
      </div>
    </main>
  );
}
