"use client";

import { useEffect, type ReactNode } from "react";
import { Direction, Tooltip } from "radix-ui";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { useLocaleStore } from "@/lib/i18n/locale-store";

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
