import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/tauri";
import { flagsAfterDrop, flagsFor, groupByQuadrant, parseQuadrantId, quadrantOf, quadrants } from "./matrix-model";

function task(id: string, isUrgent: boolean, isImportant: boolean, status: Task["status"] = "todo"): Task {
  return {
    id,
    title: id,
    notes: null,
    status,
    isUrgent,
    isImportant,
    estimateMinutes: null,
    projectId: null,
    tagIds: [],
    deletedAt: null,
    revision: 1,
    createdAt: "2026-10-15T08:00:00.000Z",
    updatedAt: "2026-10-15T08:00:00.000Z",
  };
}

describe("matrix model", () => {
  it("maps the two flags to a quadrant", () => {
    expect(quadrantOf({ isUrgent: true, isImportant: true })).toBe(1);
    expect(quadrantOf({ isUrgent: false, isImportant: true })).toBe(2);
    expect(quadrantOf({ isUrgent: true, isImportant: false })).toBe(3);
    expect(quadrantOf({ isUrgent: false, isImportant: false })).toBe(4);
  });

  it("round-trips every quadrant through its flags", () => {
    for (const quadrant of quadrants) {
      expect(quadrantOf(flagsFor(quadrant))).toBe(quadrant);
    }
  });

  it("groups only open tasks", () => {
    const groups = groupByQuadrant([task("a", true, true), task("b", false, false), task("c", true, true, "done"), task("d", false, true, "archived")]);

    expect(groups[1].map((t) => t.id)).toEqual(["a"]);
    expect(groups[4].map((t) => t.id)).toEqual(["b"]);
    expect(groups[2]).toEqual([]);
  });

  it("returns both flags for a move and null when nothing changes", () => {
    const t = task("a", true, true);
    expect(flagsAfterDrop(t, "q4")).toEqual({ isUrgent: false, isImportant: false });
    expect(flagsAfterDrop(t, "q2")).toEqual({ isUrgent: false, isImportant: true });
    expect(flagsAfterDrop(t, "q1")).toBeNull();
    expect(flagsAfterDrop(t, null)).toBeNull();
    expect(flagsAfterDrop(t, "todo")).toBeNull();
  });

  it("parses quadrant ids strictly", () => {
    expect(parseQuadrantId("q3")).toBe(3);
    expect(parseQuadrantId("q5")).toBeNull();
  });
});
