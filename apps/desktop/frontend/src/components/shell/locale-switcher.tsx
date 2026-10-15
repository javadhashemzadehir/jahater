"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isLocale, locales, localeLabels } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { useLocaleStore } from "@/lib/i18n/locale-store";

export function LocaleSwitcher() {
  const t = useTranslations();
  const { locale } = useLocale();
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label={t.locale.label}
      value={locale}
      // A single toggle group reports "" when the active item is pressed again; keep the current locale.
      onValueChange={(value) => {
        if (isLocale(value)) setLocale(value);
      }}
    >
      {locales.map((value) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={`${t.locale.switchTo}: ${localeLabels[value]}`}
          lang={value}
        >
          {localeLabels[value]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
