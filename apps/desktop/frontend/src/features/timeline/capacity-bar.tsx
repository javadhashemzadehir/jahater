"use client";

import { Info } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{t.timeline.capacityLabel}</span>
        <span className="tabular-nums">
          {t.timeline.capacityValue
            .replace("{planned}", formatDuration(load.planned, locale))
            .replace("{capacity}", formatDuration(load.capacity, locale))}
        </span>
      </div>
      <div
        role="meter"
        aria-label={t.timeline.capacityLabel}
        aria-valuemin={0}
        aria-valuemax={load.capacity}
        aria-valuenow={Math.min(load.planned, load.capacity)}
        aria-valuetext={t.timeline.capacityValue
          .replace("{planned}", formatDuration(load.planned, locale))
          .replace("{capacity}", formatDuration(load.capacity, locale))}
        className="h-2 overflow-hidden rounded-full bg-timer-track"
      >
        <div
          className={over ? "h-full bg-timer-warning" : "h-full bg-timer-progress"}
          style={{ width: `${load.fraction * 100}%` }}
        />
      </div>
      {over ? (
        <p role="status" className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t.timeline.overCapacity.replace("{over}", formatDuration(load.over, locale))}</span>
        </p>
      ) : null}
    </div>
  );
}
