import type { Locale } from "@/lib/i18n/config";

// fa shows the Jalali (Persian) calendar, en shows Gregorian.
// Storage stays Gregorian ISO 8601 UTC; convert only here.
const intlLocale: Record<Locale, string> = {
  fa: "fa-IR-u-ca-persian",
  en: "en-US-u-ca-gregory",
};

export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], options).format(date);
}

// Stub for S0.2. Full duration wording arrives with the timer work (S2.x).
export function formatDuration(totalMinutes: number, locale: Locale): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const format = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2 });
  return `${format.format(hours)}:${format.format(minutes)}`;
}

/** Clock text such as 05:30 or 1:05:30, with the digits of the locale. */
export function formatClock(totalSeconds: number, locale: Locale): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const two = new Intl.NumberFormat(intlLocale[locale], { minimumIntegerDigits: 2, useGrouping: false });
  const one = new Intl.NumberFormat(intlLocale[locale], { useGrouping: false });
  const rest = `${two.format(minutes)}:${two.format(seconds)}`;
  return hours > 0 ? `${one.format(hours)}:${rest}` : rest;
}
