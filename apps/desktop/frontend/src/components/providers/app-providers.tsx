"use client";

import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Direction, Tooltip } from "radix-ui";
import { MotionConfig } from "motion/react";
import { useLocaleStore } from "@/lib/i18n/locale-store";

function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

function LocaleHydrator({ children }: { children: ReactNode }) {
  const hydrate = useLocaleStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}

function DirectionSync({ children }: { children: ReactNode }) {
  const direction = useLocaleStore((state) => state.direction);
  return <Direction.DirectionProvider dir={direction}>{children}</Direction.DirectionProvider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleHydrator>
        <DirectionSync>
          <MotionConfig reducedMotion="user">
            <Tooltip.Provider>{children}</Tooltip.Provider>
          </MotionConfig>
        </DirectionSync>
      </LocaleHydrator>
    </ThemeProvider>
  );
}
