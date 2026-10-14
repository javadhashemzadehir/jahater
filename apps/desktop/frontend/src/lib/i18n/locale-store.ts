"use client";

import { create } from "zustand";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeDirections,
  isLocale,
  type Direction,
  type Locale,
} from "./config";

type LocaleState = {
  locale: Locale;
  direction: Direction;
  hydrate: () => void;
  setLocale: (locale: Locale) => void;
};

function applyDocument(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = localeDirections[locale];
}

function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private windows, blocked site data). The store still updates.
  }
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  direction: localeDirections[DEFAULT_LOCALE],
  hydrate: () => {
    const locale = readStoredLocale() ?? DEFAULT_LOCALE;
    applyDocument(locale);
    set({ locale, direction: localeDirections[locale] });
  },
  setLocale: (locale) => {
    applyDocument(locale);
    writeStoredLocale(locale);
    set({ locale, direction: localeDirections[locale] });
  },
}));
