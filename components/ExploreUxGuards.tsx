"use client";

import { useEffect } from "react";

const NAVIGATION_LABEL = "내 지도로 길찾기";

function normalizeNavigationButtons() {
  document
    .querySelectorAll<HTMLElement>(".kp-explore-place-card")
    .forEach((card) => {
      const routeButtons = Array.from(
        card.querySelectorAll<HTMLButtonElement>("button"),
      ).filter((button) => button.textContent?.includes("길찾기"));

      if (routeButtons.length === 0) return;

      const [primary, ...duplicates] = routeButtons;
      duplicates.forEach((button) => button.remove());

      if (primary.textContent !== NAVIGATION_LABEL) {
        primary.textContent = NAVIGATION_LABEL;
      }
    });
}

function enforceNationwideFranchiseCafeScope() {
  const activeDetail = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      ".kp-explore-detail-buttons button.is-active",
    ),
  ).find((button) => button.textContent?.trim() === "프랜차이즈");

  if (!activeDetail) return;

  const categoryTitle =
    document.querySelector<HTMLElement>(".kp-explore-filter-section h1")
      ?.textContent ?? "";
  if (!categoryTitle.includes("카페")) return;

  const regionSelect = document.querySelector<HTMLSelectElement>(
    ".kp-explore-region-selects select",
  );

  if (!regionSelect || regionSelect.value === "전국") return;

  regionSelect.value = "전국";
  regionSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function ExploreUxGuards() {
  useEffect(() => {
    const applyGuards = () => {
      normalizeNavigationButtons();
      enforceNationwideFranchiseCafeScope();
    };

    applyGuards();

    const observer = new MutationObserver(applyGuards);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
