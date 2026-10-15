"use client";

import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatClock } from "@/lib/format/date";
import type { Timer } from "@/lib/tauri";
import { elapsedSeconds, overtimeSeconds, phaseOf, remainingSeconds, ringFraction } from "./timer-math";

const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Colour follows the phase, and the phase is also written as text below the ring,
// so meaning never depends on colour alone. No animation: nothing to reduce.
const progressClass = {
  running: "stroke-timer-progress",
  warning: "stroke-timer-warning",
  paused: "stroke-timer-track",
  reached: "stroke-timer-overtime",
} as const;

export function CircularTimer({ timer, nowMs }: { timer: Timer; nowMs: number }) {
  const t = useTranslations();
  const { locale } = useLocale();

  const phase = phaseOf(timer, nowMs);
  const fraction = ringFraction(timer, nowMs);
  const remaining = remainingSeconds(timer, nowMs);
  const overtime = overtimeSeconds(timer, nowMs);

  // With a target the big number counts down, then up past zero. Without one it counts up.
  const big =
    remaining === null ? formatClock(elapsedSeconds(timer, nowMs), locale) : overtime > 0 ? `+${formatClock(overtime, locale)}` : formatClock(remaining, locale);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-60">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={RADIUS} fill="none" strokeWidth="12" className="stroke-timer-track" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            className={progressClass[phase]}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tabular-nums" dir="ltr">
            {big}
          </span>
          <span className="text-xs text-muted-foreground">
            {remaining === null ? t.timer.elapsed : overtime > 0 ? t.timer.overtime : t.timer.remaining}
          </span>
        </div>
      </div>
      {/* Announced when the phase changes, not on every tick. */}
      <p role="status" className="text-sm font-medium">
        {t.timer.phase[phase]}
      </p>
    </div>
  );
}
