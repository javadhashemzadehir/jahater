"use client";

import * as React from "react";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

// Jahater mark from the brand pack (docs/ADR/010). The ring is the day, the arrow leaves it.
// Never close the ring and never recolour the arrow: it is the only Amber element on Paper.
// Brand marks are assets, not UI-kit components (ADR 009 covers controls, not artwork).
function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
      {...props}
    >
      <path
        d="M60.9 19.9A32 32 0 1 0 80.1 39.1"
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-foreground"
      />
      <path
        d="M44 56L90 10M68 10H90V32"
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-brand-arrow"
      />
    </svg>
  );
}

// "Jahat" + "er" in English, "جهت" + "ر" in Persian: the last part takes the brand accent.
// Latin: Comfortaa 600 with -3% tracking. Persian: Yekan Bakh bold, no letter-spacing.
function Logo({ className }: { className?: string }) {
  const t = useTranslations();
  const { locale } = useLocale();

  return (
    <span
      role="img"
      aria-label={t.app.name}
      className={cn("inline-flex items-center gap-2 text-foreground", className)}
    >
      <LogoMark />
      <span
        aria-hidden="true"
        className={cn(
          "leading-none",
          locale === "fa" ? "text-2xl font-bold" : "text-2xl font-semibold tracking-[-0.03em]",
        )}
      >
        {t.app.brandBase}
        <span className="font-bold text-brand-accent">{t.app.brandAccent}</span>
      </span>
    </span>
  );
}

export { Logo, LogoMark };
