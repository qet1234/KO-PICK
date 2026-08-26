type AppIconName =
  | "home"
  | "search"
  | "bookmark"
  | "briefcase"
  | "user"
  | "bell"
  | "back"
  | "route"
  | "phone"
  | "share"
  | "clock"
  | "users";

export default function AppIcon({
  name,
  size = 22,
}: {
  name: AppIconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>;
  if (name === "bookmark") return <svg {...common}><path d="M6 3.5h12v17l-6-3.8-6 3.8z" /></svg>;
  if (name === "briefcase") return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" /></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="7.5" r="3.5" /><path d="M4.5 21c.4-4.3 3-6.6 7.5-6.6s7.1 2.3 7.5 6.6" /></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16 18 16 18 9Z" /><path d="M10 21h4" /></svg>;
  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  if (name === "route") return <svg {...common}><path d="m4 19 5.5-11 3 5L20 5" /><path d="m15 5 5 0 0 5" /></svg>;
  if (name === "phone") return <svg {...common}><path d="M7 3 4.5 5.5c0 7.7 6.3 14 14 14L21 17l-4-3-2.2 2.2a13.4 13.4 0 0 1-7-7L10 7Z" /></svg>;
  if (name === "share") return <svg {...common}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  return <svg {...common}><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6" /></svg>;
}
