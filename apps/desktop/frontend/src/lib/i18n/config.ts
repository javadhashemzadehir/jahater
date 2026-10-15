export const locales = ["fa", "en"] as const;

export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "fa";

export type Direction = "rtl" | "ltr";

export const localeDirections: Record<Locale, Direction> = {
  fa: "rtl",
  en: "ltr",
};

// Native names are shown in their own language, so they are not translated.
export const localeLabels: Record<Locale, string> = {
  fa: "فارسی",
  en: "English",
};

export const LOCALE_STORAGE_KEY = "selfplanner.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
