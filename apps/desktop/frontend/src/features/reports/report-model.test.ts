import { describe, expect, it } from "vitest";
import type { Task, TrackedEntry } from "@/lib/tauri";
import { NONE_KEY, buildReport, dayFromKey, differenceMinutes, localDayKey, rangeFor } from "./report-model";

function task(id: string, estimateMinutes: number | null, projectId: string | null = null, tagIds: string[] = []): Task {
  return {
    id,
    title: id,
    notes: null,
    status: "todo",
    isUrgent: false,
    isImportant: false,
    estimateMinutes,
    projectId,
    tagIds,
    deletedAt: null,
    revision: 1,
    createdAt: "2026-10-15T08:00:00.000Z",
    updatedAt: "2026-10-15T08:00:00.000Z",
  };
}

// Local-time constructors keep day grouping independent of the machine's time zone.
const day = (d: number, h = 9) => new Date(2026, 9, d, h).toISOString();

function entry(id: string, taskId: string | null, startedAt: string, minutes: number): TrackedEntry {
  return { id, taskId, mode: "tracker", startedAt, endedAt: startedAt, actualSeconds: minutes * 60 };
}

const tasks = [task("a", 60, "p1", ["t1", "t2"]), task("b", 30, "p1"), task("c", null, "p2")];
const entries = [
  entry("e1", "a", day(15), 40),
  entry("e2", "a", day(16), 35),
  entry("e3", "b", day(16), 10),
  entry("e4", "c", day(16), 20),
  entry("e5", null, day(16), 5),
];

describe("buildReport", () => {
  it("groups by task and counts each estimate once", () => {
    const report = buildReport(entries, tasks, "task");
    const a = report.rows.find((row) => row.key === "a");
    expect(a).toMatchObject({ estimateMinutes: 60, actualSeconds: 75 * 60 });
    expect(report.rows.find((row) => row.key === NONE_KEY)).toMatchObject({ estimateMinutes: 0, actualSeconds: 300 });
    expect(report.total).toEqual({ estimateMinutes: 90, actualSeconds: 110 * 60 });
  });

  it("orders task rows by tracked time, most first", () => {
    const keys = buildReport(entries, tasks, "task").rows.map((row) => row.key);
    expect(keys).toEqual(["a", "c", "b", NONE_KEY]);
  });

  it("groups by project and puts unlinked time in none", () => {
    const rows = buildReport(entries, tasks, "project").rows;
    expect(rows.find((row) => row.key === "p1")).toMatchObject({ estimateMinutes: 90, actualSeconds: 85 * 60 });
    expect(rows.find((row) => row.key === "p2")).toMatchObject({ estimateMinutes: 0, actualSeconds: 20 * 60 });
    expect(rows.find((row) => row.key === NONE_KEY)?.actualSeconds).toBe(300);
  });

  it("groups by day in order, with a task's estimate on the first day it was worked", () => {
    const rows = buildReport(entries, tasks, "day").rows;
    expect(rows.map((row) => row.key)).toEqual([localDayKey(day(15)), localDayKey(day(16))]);
    expect(rows[0]).toMatchObject({ estimateMinutes: 60, actualSeconds: 40 * 60 });
    expect(rows[1]).toMatchObject({ estimateMinutes: 30, actualSeconds: 70 * 60 });
  });

  it("lists a task under each of its tags and untagged time under none", () => {
    const rows = buildReport(entries, tasks, "tag").rows;
    expect(rows.find((row) => row.key === "t1")?.actualSeconds).toBe(75 * 60);
    expect(rows.find((row) => row.key === "t2")?.actualSeconds).toBe(75 * 60);
    expect(rows.find((row) => row.key === NONE_KEY)?.actualSeconds).toBe(35 * 60);
  });

  it("treats time on a removed task as having no estimate", () => {
    const report = buildReport([entry("e", "gone", day(15), 10)], tasks, "task");
    expect(report.rows[0]).toMatchObject({ key: "gone", estimateMinutes: 0, actualSeconds: 600 });
  });

  it("returns an empty report for no entries", () => {
    expect(buildReport([], tasks, "task")).toEqual({ rows: [], total: { estimateMinutes: 0, actualSeconds: 0 } });
  });
});

describe("report helpers", () => {
  it("compares actual with the estimate and skips rows with none", () => {
    expect(differenceMinutes(60, 75 * 60)).toBe(15);
    expect(differenceMinutes(60, 45 * 60)).toBe(-15);
    expect(differenceMinutes(0, 600)).toBeNull();
  });

  it("builds a half-open range of local days ending tomorrow", () => {
    const today = new Date(2026, 9, 15, 13, 30);
    expect(rangeFor(1, today)).toEqual({
      from: new Date(2026, 9, 15).toISOString(),
      to: new Date(2026, 9, 16).toISOString(),
    });
    expect(rangeFor(7, today).from).toBe(new Date(2026, 9, 9).toISOString());
  });

  it("turns a day key back into a local date", () => {
    expect(dayFromKey("2026-10-15").getTime()).toBe(new Date(2026, 9, 15).getTime());
  });
});
