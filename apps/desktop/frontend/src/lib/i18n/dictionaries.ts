import en from "@/locales/en/common.json";
import fa from "@/locales/fa/common.json";
import type { Locale } from "./config";

// The fa file defines the dictionary shape. Missing keys in en fail typecheck.
export type Dictionary = typeof fa;

export const dictionaries: Record<Locale, Dictionary> = {
  fa,
  en: en satisfies Dictionary,
};
