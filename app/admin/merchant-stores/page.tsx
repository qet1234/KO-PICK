import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, getAdminAccess } from "@/utils/admin";
import AdminMerchantStores, { type AdminMerchantStore } from "./AdminMerchantStores";
import "../admin.css";
import "./merchant-stores.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "입점 승인 | 오늘어디 운영 관리자",
  robots: { follow: false, index: false },
};

function ownerName(user: { email?: string; user_metadata?: Record<string, unknown> } | undefined) {
  if (!user) return "계정 정보 없음";
  return String(
    user.user_metadata?.full_name
      ?? user.user_metadata?.name
      ?? user.email?.split("@")[0]
      ?? "이름 없음",
  );
}

export default async function MerchantStoresAdminPage() {
  const access = await getAdminAccess();
  if (!access.user) redirect("/login?next=/admin/merchant-stores");

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
  const [storesResult, usersResult] = await Promise.all([
    adminClient
      .from("merchant_stores")
      .select("id,owner_user_id,place_source,place_id,name,address,phone,approval_status,review_note,reviewed_at,reviewed_by,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (storesResult.error) console.error("입점 신청 조회 오류:", storesResult.error.message);
  if (usersResult.error) console.error("입점 계정 조회 오류:", usersResult.error.message);

  const users = new Map((usersResult.data?.users ?? []).map((user) => [user.id, user]));
  const stores: AdminMerchantStore[] = (storesResult.data ?? []).map((store) => {
    const owner = users.get(store.owner_user_id);
    return {
      ...store,
      approval_status: store.approval_status as AdminMerchantStore["approval_status"],
      owner_email: owner?.email ?? "이메일 없음",
      owner_name: ownerName(owner),
    };
  });

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <Image src="/brand-mark.svg" alt="" width={42} height={42} priority />
          <span><strong>오늘어디</strong><small>OPERATOR</small></span>
        </Link>
        <nav aria-label="관리자 메뉴">
          <Link href="/admin"><span>01</span>운영 현황</Link>
          <a href="#merchant-applications"><span>02</span>입점 승인</a>
          <Link href="/owner"><span>03</span>공개 모집 페이지</Link>
        </nav>
        <div className="admin-sidebar-bottom">
          <small>접속 계정</small>
          <strong>{access.user.email}</strong>
          <Link href="/">서비스 화면 보기</Link>
        </div>
      </aside>

      <div className="admin-main merchant-admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">MERCHANT ONBOARDING</span>
            <h1>입점 승인 관리</h1>
            <p>사장님 신청 정보를 확인하고 고객 예약 노출 여부를 결정하세요.</p>
          </div>
          <Link className="merchant-public-link" href="/owner">공개 모집 페이지 보기</Link>
        </header>
        <AdminMerchantStores initialStores={stores} />
      </div>
    </main>
  );
}
