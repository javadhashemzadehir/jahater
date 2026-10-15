"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    return <Skeleton className="h-8 w-26" />;
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      aria-label={t.theme.label}
      value={theme}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
    >
      {options.map(({ value, icon: Icon, key }) => (
        <Tooltip key={value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem value={value} aria-label={t.theme[key]}>
              <Icon aria-hidden="true" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>{t.theme[key]}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
