"use client";

import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useTranslations } from "@/hooks/use-locale";

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <div className="flex min-h-dvh flex-col">
      <Button
        asChild
        variant="outline"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50"
      >
        <a href="#main">{t.app.skipToContent}</a>
      </Button>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col p-4">
        {children}
      </main>
    </div>
  );
}
