import { describe, expect, it } from "vitest";
import { elapsedSeconds, overtimeSeconds, phaseOf, remainingSeconds, ringFraction, type TimerTimes } from "./timer-math";

const START = Date.parse("2026-10-15T08:00:00.000Z");
const at = (seconds: number) => START + seconds * 1000;

function timer(overrides: Partial<TimerTimes> = {}): TimerTimes {
  return {
    startedAt: "2026-10-15T08:00:00.000Z",
    pausedAt: null,
    pausedTotalSec: 0,
    targetMin: null,
    ...overrides,
  };
}

describe("timer math", () => {
  it("derives elapsed from timestamps, including a long gap with no ticks", () => {
    expect(elapsedSeconds(timer(), at(90))).toBe(90);
    expect(elapsedSeconds(timer(), at(8 * 3600))).toBe(8 * 3600);
  });

  it("never goes negative when the clock is behind the start", () => {
    expect(elapsedSeconds(timer(), at(-3600))).toBe(0);
  });

  it("freezes while paused and excludes earlier pauses", () => {
    const paused = timer({ pausedAt: "2026-10-15T08:10:00.000Z", pausedTotalSec: 120 });
    expect(elapsedSeconds(paused, at(600))).toBe(480);
    expect(elapsedSeconds(paused, at(9999))).toBe(480);
  });

  it("counts down to a target and then reports overtime", () => {
    const box = timer({ targetMin: 10 });
    expect(remainingSeconds(box, at(240))).toBe(360);
    expect(remainingSeconds(box, at(900))).toBe(0);
    expect(overtimeSeconds(box, at(900))).toBe(300);
    expect(overtimeSeconds(box, at(300))).toBe(0);
    expect(remainingSeconds(timer(), at(10))).toBeNull();
  });

  it("moves from running to warning to reached, and paused wins", () => {
    const box = { ...timer({ targetMin: 10 }), isPaused: false };
    expect(phaseOf(box, at(60))).toBe("running");
    expect(phaseOf(box, at(500))).toBe("warning");
    expect(phaseOf(box, at(600))).toBe("reached");
    expect(phaseOf({ ...box, isPaused: true }, at(600))).toBe("paused");
    expect(phaseOf({ ...timer(), isPaused: false }, at(99999))).toBe("running");
  });

  it("fills the ring toward the target, or sweeps once an hour without one", () => {
    expect(ringFraction(timer({ targetMin: 10 }), at(300))).toBe(0.5);
    expect(ringFraction(timer({ targetMin: 10 }), at(5000))).toBe(1);
    expect(ringFraction(timer(), at(900))).toBe(0.25);
    expect(ringFraction(timer(), at(3600))).toBe(0);
  });
});
