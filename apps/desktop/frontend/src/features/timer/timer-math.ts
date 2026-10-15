import type { Timer } from "@/lib/tauri";

// Mirrors `TimeEntry::elapsed_seconds` in Rust. The backend owns the timer; the UI only
// recomputes what to show between ticks from the same timestamps (ADR 006).

export type TimerTimes = Pick<Timer, "startedAt" | "pausedAt" | "pausedTotalSec" | "targetMin">;

export function elapsedSeconds(timer: TimerTimes, nowMs: number): number {
  const startMs = Date.parse(timer.startedAt);
  const endMs = timer.pausedAt ? Date.parse(timer.pausedAt) : nowMs;
  const gross = Math.floor((endMs - startMs) / 1000);
  return Math.max(0, gross - timer.pausedTotalSec);
}

/** Seconds left on the target, or null when there is no target. Zero once reached. */
export function remainingSeconds(timer: TimerTimes, nowMs: number): number | null {
  if (timer.targetMin === null) return null;
  return Math.max(0, timer.targetMin * 60 - elapsedSeconds(timer, nowMs));
}

/** Seconds past the target, or 0. */
export function overtimeSeconds(timer: TimerTimes, nowMs: number): number {
  if (timer.targetMin === null) return 0;
  return Math.max(0, elapsedSeconds(timer, nowMs) - timer.targetMin * 60);
}

export type TimerPhase = "running" | "paused" | "warning" | "reached";

/** `warning` is the last fifth of a target: a calm heads-up, not an alarm. */
export function phaseOf(timer: TimerTimes & { isPaused: boolean }, nowMs: number): TimerPhase {
  if (timer.isPaused) return "paused";
  const remaining = remainingSeconds(timer, nowMs);
  if (remaining === null || timer.targetMin === null) return "running";
  if (remaining === 0) return "reached";
  return remaining <= timer.targetMin * 60 * 0.2 ? "warning" : "running";
}

/** How much of the ring is filled, from 0 to 1. Without a target the ring sweeps once an hour. */
export function ringFraction(timer: TimerTimes, nowMs: number): number {
  const elapsed = elapsedSeconds(timer, nowMs);
  if (timer.targetMin === null) return (elapsed % 3600) / 3600;
  return Math.min(1, elapsed / (timer.targetMin * 60));
}
