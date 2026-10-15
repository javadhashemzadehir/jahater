"use client";

import { Button } from "@/components/ui/button";
import { locales, localeLabels } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { useLocaleStore } from "@/lib/i18n/locale-store";

export function LocaleSwitcher() {
  const t = useTranslations();
  const { locale } = useLocale();
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <div role="group" aria-label={t.locale.label} className="inline-flex gap-1 rounded-md border border-border p-1">
      {locales.map((value) => {
        const pressed = locale === value;
        return (
          <Button
            key={value}
            variant={pressed ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={pressed}
            aria-label={`${t.locale.switchTo}: ${localeLabels[value]}`}
            lang={value}
            onClick={() => setLocale(value)}
          >
            {localeLabels[value]}
          </Button>
        );
      })}
    </div>
  );
}
