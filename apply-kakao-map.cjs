const fs = require("fs");

const pagePath = "./app/page.tsx";
const cssPath = "./app/home.css";

let page = fs.readFileSync(pagePath, "utf8");

if (!page.includes('import KakaoRegionExplorer')) {
  page = page.replace(
    'import AuthHeader from "@/components/AuthHeader";',
    'import AuthHeader from "@/components/AuthHeader";\nimport KakaoRegionExplorer from "@/components/KakaoRegionExplorer";'
  );
}

const sectionStart = page.indexOf(
  '      <section className="kp-region-section"'
);

const nextSectionStart = page.indexOf(
  '      <section className="kp-ai-section"',
  sectionStart
);

if (sectionStart === -1 || nextSectionStart === -1) {
  throw new Error("지역 섹션을 찾지 못했습니다. page.tsx 백업을 유지하세요.");
}

page =
  page.slice(0, sectionStart) +
  "      <KakaoRegionExplorer />\n\n" +
  page.slice(nextSectionStart);

fs.writeFileSync(pagePath, page, "utf8");

let css = fs.readFileSync(cssPath, "utf8");

if (!css.includes("/* Kakao region explorer */")) {
  css += `

/* Kakao region explorer */
.kp-region-explorer-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.5fr);
  gap: 54px;
  align-items: stretch;
}

.kp-region-map-shell {
  min-width: 0;
  min-height: 560px;
  position: relative;
  overflow: hidden;
  border: 1px solid #deded8;
  background: #f1f1ed;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.09);
}

.kp-region-map {
  width: 100%;
  height: 100%;
  min-height: 560px;
}

.kp-region-map-label {
  position: absolute;
  z-index: 10;
  top: 18px;
  left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 112px;
  padding: 11px 14px;
  color: #fff;
  background: #ff3838;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.kp-region-map-label small {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.kp-region-map-label strong {
  font-size: 18px;
  line-height: 1.2;
}

.kp-region-map-state {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  color: #333;
  background: rgba(250, 250, 247, 0.92);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.kp-region-map-error {
  color: #a40000;
}

.kp-region-buttons button {
  cursor: pointer;
}

.kp-region-buttons button.is-active {
  color: #fff;
  border-color: #ff3838;
  background: #ff3838;
}

@media (max-width: 980px) {
  .kp-region-explorer-grid {
    grid-template-columns: 1fr;
    gap: 34px;
  }

  .kp-region-map-shell,
  .kp-region-map {
    min-height: 500px;
  }
}

@media (max-width: 680px) {
  .kp-region-map-shell,
  .kp-region-map {
    min-height: 420px;
  }

  .kp-region-map-label {
    top: 12px;
    left: 12px;
  }
}
`;
}

fs.writeFileSync(cssPath, css, "utf8");

console.log("카카오 지도 적용 완료");
