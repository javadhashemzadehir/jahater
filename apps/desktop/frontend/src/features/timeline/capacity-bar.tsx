"use client";

import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatDuration } from "@/lib/format/date";
import type { Load } from "./timeline-model";

/**
 * Planned work against the daily capacity. Going over is shown as information plus a choice,
 * in words as well as colour, and nothing is ever moved automatically.
 */
export function CapacityBar({ load }: { load: Load }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const over = load.over > 0;
  const valueText = t.timeline.capacityValue
    .replace("{planned}", formatDuration(load.planned, locale))
    .replace("{capacity}", formatDuration(load.capacity, locale));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{t.timeline.capacityLabel}</span>
        <span className="tabular-nums">{valueText}</span>
      </div>
      <Progress
        aria-label={t.timeline.capacityLabel}
        value={load.fraction * 100}
        getValueLabel={() => valueText}
        className={over ? "*:data-[slot=progress-indicator]:bg-timer-warning" : undefined}
      />
      {over ? (
        <Alert>
          <Info aria-hidden />
          <AlertDescription>{t.timeline.overCapacity.replace("{over}", formatDuration(load.over, locale))}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
