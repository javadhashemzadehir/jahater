import { describe, expect, it } from "vitest";
import {
  loadOf,
  plannedMinutes,
  addDays,
  assignLanes,
  dayRange,
  geometry,
  isSameDay,
  isoFromTimeInput,
  minutesIntoDay,
  movedStart,
  snap,
  startOfDay,
  timeInputValue,
} from "./timeline-model";

// Local-time constructors keep these tests independent of the machine's time zone.
const day = new Date(2026, 9, 15);
const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m).toISOString();

describe("timeline model", () => {
  it("gives a local day as a half-open range one day long", () => {
    const { from, to } = dayRange(new Date(2026, 9, 15, 17, 45));
    expect(from).toBe(startOfDay(day).toISOString());
    expect(to).toBe(addDays(day, 1).toISOString());
  });

  it("measures minutes into the day and compares days", () => {
    expect(minutesIntoDay(at(9, 30), day)).toBe(570);
    expect(isSameDay(new Date(2026, 9, 15, 23, 59), day)).toBe(true);
    expect(isSameDay(new Date(2026, 9, 16, 0, 0), day)).toBe(false);
  });

  it("snaps to five minutes", () => {
    expect(snap(7)).toBe(5);
    expect(snap(8)).toBe(10);
    expect(snap(-3)).toBe(-5);
  });

  it("moves a block by a delta, snapped", () => {
    expect(movedStart(at(9), 30, 22, day)).toBe(at(9, 20));
    expect(movedStart(at(9), 30, -60, day)).toBe(at(8));
  });

  it("keeps a moved block inside the day", () => {
    expect(movedStart(at(1), 30, -600, day)).toBe(at(0));
    expect(movedStart(at(22), 60, 600, day)).toBe(at(23));
  });

  it("round-trips a time input value", () => {
    expect(timeInputValue(at(7, 5))).toBe("07:05");
    expect(isoFromTimeInput(day, "07:05")).toBe(at(7, 5));
    expect(isoFromTimeInput(day, "24:00")).toBeNull();
    expect(isoFromTimeInput(day, "7:5")).toBeNull();
  });

  it("clips geometry to the day and keeps short blocks tall enough to use", () => {
    expect(geometry(at(9), 60, day)).toEqual({ top: 540, height: 60 });
    expect(geometry(at(9), 5, day).height).toBe(20);
    const crossing = geometry(new Date(2026, 9, 14, 23, 0).toISOString(), 120, day);
    expect(crossing).toEqual({ top: 0, height: 60 });
  });

  it("places overlapping blocks side by side and leaves lone blocks full width", () => {
    const lanes = assignLanes([
      { id: "a", start: 540, end: 600 },
      { id: "b", start: 570, end: 630 },
      { id: "c", start: 700, end: 730 },
    ]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("b")).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get("c")).toEqual({ lane: 0, lanes: 1 });
  });

  it("reuses a freed lane inside one overlap group", () => {
    const lanes = assignLanes([
      { id: "a", start: 0, end: 100 },
      { id: "b", start: 10, end: 50 },
      { id: "c", start: 60, end: 90 },
    ]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("b")).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get("c")).toEqual({ lane: 1, lanes: 2 });
  });

  it("treats blocks that only touch as separate", () => {
    const lanes = assignLanes([
      { id: "a", start: 0, end: 60 },
      { id: "b", start: 60, end: 120 },
    ]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get("b")).toEqual({ lane: 0, lanes: 1 });
  });
});

describe("daily load", () => {
  const block = (h: number, minutes: number, kind = "task") => ({ startAt: at(h), durationMin: minutes, kind });

  it("adds up planned work and ignores buffers, transitions and free time", () => {
    const blocks = [block(9, 60), block(11, 30, "event"), block(12, 45, "buffer"), block(13, 15, "transition"), block(14, 60, "free")];
    expect(plannedMinutes(blocks, day)).toBe(90);
  });

  it("clips a block that crosses midnight to the day being measured", () => {
    const evening = { startAt: new Date(2026, 9, 14, 23, 0).toISOString(), durationMin: 120, kind: "task" };
    expect(plannedMinutes([evening], day)).toBe(60);
    expect(plannedMinutes([evening], new Date(2026, 9, 14))).toBe(60);
  });

  it("counts overlapping blocks twice, because that is the load", () => {
    expect(plannedMinutes([block(9, 60), block(9, 30)], day)).toBe(90);
  });

  it("reports how far over capacity a day is, and caps the bar at full", () => {
    expect(loadOf(240, 360)).toEqual({ planned: 240, capacity: 360, over: 0, fraction: 240 / 360 });
    expect(loadOf(450, 360)).toEqual({ planned: 450, capacity: 360, over: 90, fraction: 1 });
    expect(loadOf(0, 360).fraction).toBe(0);
  });
});
