"use client";

import { useEffect } from "react";

function applyInviteUiPatch() {
  const input = document.querySelector<HTMLInputElement>("input.couple-code-input");
  if (input) {
    input.maxLength = 32;
    input.placeholder = "32자리 보안 초대 코드";
    input.autocomplete = "one-time-code";
    input.inputMode = "text";
    input.setAttribute("aria-describedby", "couple-secure-invite-help");
  }

  const joinCard = document.querySelector<HTMLElement>(".couple-connect-card.is-join");
  if (!joinCard) return;

  const description = joinCard.querySelector<HTMLParagraphElement>("p");
  if (description) {
    description.id = "couple-secure-invite-help";
    description.textContent =
      "상대방에게 받은 32자리 보안 초대 코드를 입력하세요. 기존 8자리 코드는 만료 전까지 사용할 수 있어요.";
  }
}

export default function CoupleInviteSecurityUiPatch() {
  useEffect(() => {
    applyInviteUiPatch();

    const observer = new MutationObserver(() => applyInviteUiPatch());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
