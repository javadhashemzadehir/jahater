"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useLocale, useTranslations } from "@/hooks/use-locale";
import { formatClock } from "@/lib/format/date";
import type { Timer } from "@/lib/tauri";
import { elapsedSeconds, overtimeSeconds, phaseOf, remainingSeconds, ringFraction } from "./timer-math";

// Colour follows the phase, and the phase is also written as text below the ring,
// so meaning never depends on colour alone. No animation: nothing to reduce.
const chartConfig = {
  track: { color: "var(--timer-track)" },
  running: { color: "var(--timer-progress)" },
  warning: { color: "var(--timer-warning)" },
  paused: { color: "var(--timer-track)" },
  reached: { color: "var(--timer-overtime)" },
} satisfies ChartConfig;

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

  const data = [{ value: fraction * 100, fill: `var(--color-${phase})` }];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-60">
        {/* A clock face: clockwise from the top in both directions, never mirrored. */}
        <ChartContainer config={chartConfig} className="aspect-square size-full" aria-hidden>
          <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="80%" outerRadius="100%" barSize={12}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              isAnimationActive={false}
              background={{ fill: "var(--color-track)" }}
            />
          </RadialBarChart>
        </ChartContainer>
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
