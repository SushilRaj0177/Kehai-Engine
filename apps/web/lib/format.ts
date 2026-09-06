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

export function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
