"use client";

import { useLocaleStore } from "@/lib/i18n/locale-store";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Direction, Locale } from "@/lib/i18n/config";

export function useLocale(): { locale: Locale; direction: Direction } {
  const locale = useLocaleStore((state) => state.locale);
  const direction = useLocaleStore((state) => state.direction);
  return { locale, direction };
}

export function useTranslations(): Dictionary {
  const locale = useLocaleStore((state) => state.locale);
  return dictionaries[locale];
}
