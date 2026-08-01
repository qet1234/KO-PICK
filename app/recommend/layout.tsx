import type { ReactNode } from "react";

export default function RecommendLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`.recommend-header-links { display: none !important; }`}</style>
      {children}
    </>
  );
}
