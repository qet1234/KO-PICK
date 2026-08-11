"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { OperationalFeatureFlags, OperationalFeatureKey } from "@/utils/app-service-status";
import { setClientFeatureFlags } from "@/utils/feature-flags-client";

const pathFeatures: Array<[string, OperationalFeatureKey, string]> = [
  ["/explore", "place_search", "장소 찾기"],
  ["/recommend", "recommendations", "추천·코스"],
  ["/office-dining", "office_dining", "직장인 식사"],
  ["/saved", "saved_places", "저장한 장소"],
  ["/choose", "shared_poll", "함께 고르기"],
  ["/reservations", "reservations", "예약 연결"],
];

export default function WebFeatureFlagGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [flags, setFlags] = useState<OperationalFeatureFlags | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const controller = new AbortController();
    const refresh = () => {
      void fetch("/api/app-status?platform=web&version=1.0.0", { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload: { featureFlags?: OperationalFeatureFlags } | null) => {
          const next = payload?.featureFlags ?? null;
          setClientFeatureFlags(next);
          setFlags(next);
        })
        .catch(() => { setClientFeatureFlags(null); setFlags(null); });
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [pathname]);

  const match = pathFeatures.find(([prefix]) => pathname.startsWith(prefix));
  if (match && flags?.[match[1]] === false) {
    return (
      <main className="feature-disabled-screen">
        <section>
          <span>FEATURE PAUSED</span>
          <h1>{match[2]} 기능을 잠시 중지했습니다</h1>
          <p>운영자가 기능을 점검하고 있습니다. 다른 기능은 정상적으로 이용할 수 있습니다.</p>
          <Link href="/">홈으로 돌아가기</Link>
        </section>
      </main>
    );
  }

  return children;
}
