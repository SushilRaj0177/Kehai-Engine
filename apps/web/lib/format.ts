export function formatDateRange(startsAt: string, endsAt: string, locale: "en" | "ja" = "en"): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const intlLocale = locale === "ja" ? "ja-JP" : "en-US";
  const dateFmt = new Intl.DateTimeFormat(intlLocale, { month: locale === "ja" ? "long" : "short", day: "numeric", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(intlLocale, { hour: "numeric", minute: "2-digit" });
  const sameDay = start.toDateString() === end.toDateString();
  const dash = locale === "ja" ? "〜" : "–";
  return sameDay
    ? `${dateFmt.format(start)} · ${timeFmt.format(start)} ${dash} ${timeFmt.format(end)}`
    : `${dateFmt.format(start)} ${dash} ${dateFmt.format(end)}`;
}

export function formatRelativeMinutes(minutes: number): string {
  if (minutes === 0) return "on time";
  const abs = Math.abs(Math.round(minutes));
  return minutes < 0 ? `${abs}m early` : `${abs}m after start`;
}

export function formatDate(iso: string, locale: "en" | "ja" = "en"): string {
  const intlLocale = locale === "ja" ? "ja-JP" : "en-US";
  return new Intl.DateTimeFormat(intlLocale, { month: locale === "ja" ? "long" : "short", day: "numeric", year: "numeric" }).format(
    new Date(iso)
  );
}

// A raw "{n}s" label reads fine at 20s but turns unreadable — or, for a
// stray out-of-range value, absurd ("83274893274843748923s") — the moment
// the rotation interval is minutes or hours instead of seconds. Format to
// the coarsest unit that keeps the number small, and clamp first so a bad
// stored value can never render as a wall of digits.
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.min(86400, Math.max(0, Math.round(totalSeconds) || 0));
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatDateTime(date: Date, locale: "en" | "ja" = "en"): string {
  const intlLocale = locale === "ja" ? "ja-JP" : "en-US";
  const dateFmt = new Intl.DateTimeFormat(intlLocale, { month: locale === "ja" ? "long" : "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(intlLocale, { hour: "numeric", minute: "2-digit" });
  return `${dateFmt.format(date)} · ${timeFmt.format(date)}`;
}

export function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
