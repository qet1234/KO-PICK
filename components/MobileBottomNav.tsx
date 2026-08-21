"use client";

import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/explore", label: "장소 찾기", icon: "⌕" },
  { href: "/saved", label: "저장", icon: "♡" },
  { href: "/office-dining", label: "직장인 식사", icon: "▣" },
  { href: "/account", label: "내 계정", icon: "♙" },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="kp-mobile-bottom-nav" aria-label="모바일 주요 메뉴">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <a aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={item.href} key={item.href}>
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </a>
        );
      })}
    </nav>
  );
}
