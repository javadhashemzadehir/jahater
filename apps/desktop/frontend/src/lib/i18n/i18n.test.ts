import { describe, expect, it } from "vitest";
import { formatDate } from "../format/date";
import { dictionaries } from "./dictionaries";
import { DEFAULT_LOCALE, isLocale, localeDirections } from "./config";

function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe("i18n dictionaries", () => {
  it("has the same keys in fa and en", () => {
    expect(keysOf(dictionaries.en).sort()).toEqual(keysOf(dictionaries.fa).sort());
  });

  it("defaults to fa with RTL, and en is LTR", () => {
    expect(DEFAULT_LOCALE).toBe("fa");
    expect(localeDirections.fa).toBe("rtl");
    expect(localeDirections.en).toBe("ltr");
  });

  it("accepts only known locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("formatDate", () => {
  const date = new Date("2026-10-15T12:00:00Z");

  it("shows the Gregorian calendar for en", () => {
    expect(formatDate(date, "en")).toContain("2026");
  });

  it("shows the Jalali calendar for fa", () => {
    expect(formatDate(date, "fa")).toContain("۱۴۰۵");
  });
});
