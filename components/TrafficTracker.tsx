"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/traffic", {
        body: JSON.stringify({ path: pathname }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
        signal: controller.signal,
      }).catch(() => undefined);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pathname]);

  return null;
}
