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

export default function ExploreUxGuards() {
  useEffect(() => {
    normalizeNavigationButtons();

    const observer = new MutationObserver(normalizeNavigationButtons);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
