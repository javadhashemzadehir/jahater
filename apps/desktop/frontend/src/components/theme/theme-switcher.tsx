"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { useTranslations } from "@/hooks/use-locale";

const options = [
  { value: "light", icon: Sun, key: "light" },
  { value: "dark", icon: Moon, key: "dark" },
  { value: "system", icon: Monitor, key: "system" },
] as const;

export function ThemeSwitcher() {
  const t = useTranslations();
  const isClient = useIsClient();
  const { theme, setTheme } = useTheme();

  // Same footprint before mount, so hydration does not shift the header.
  if (!isClient) {
    return <div className="h-10 w-28" aria-hidden="true" />;
  }

  return (
    <div role="group" aria-label={t.theme.label} className="inline-flex gap-1 rounded-md border border-border p-1">
      {options.map(({ value, icon: Icon, key }) => {
        const pressed = theme === value;
        return (
          <Button
            key={value}
            variant={pressed ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={pressed}
            aria-label={t.theme[key]}
            title={t.theme[key]}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
