export const VISITOR_ID_KEY = "koreapick-visitor-id";

const LOCAL_SERVICE_KEYS = [
  VISITOR_ID_KEY,
  "kopick-recommend-preferences",
  "kopick-saved-places",
  "kopick:preferred-navigation-provider",
] as const;

const SESSION_SERVICE_KEYS = [
  "kopick:tour-place-cache:v2",
] as const;

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(VISITOR_ID_KEY) ?? "";
}

export function getOrCreateVisitorId() {
  const current = getVisitorId();
  if (current) return current;

  const next =
    typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(VISITOR_ID_KEY, next);
  return next;
}

export function clearLocalServiceData() {
  if (typeof window === "undefined") return;
  LOCAL_SERVICE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  SESSION_SERVICE_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
}
