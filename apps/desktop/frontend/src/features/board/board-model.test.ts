import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/tauri";
import { groupByStatus, isBoardStatus, statusAfterDrop } from "./board-model";

function task(id: string, status: Task["status"]): Task {
  return {
    id,
    title: id,
    notes: null,
    status,
    isUrgent: false,
    isImportant: false,
    estimateMinutes: null,
    projectId: null,
    tagIds: [],
    deletedAt: null,
    revision: 1,
    createdAt: "2026-10-15T08:00:00.000Z",
    updatedAt: "2026-10-15T08:00:00.000Z",
  };
}

describe("board model", () => {
  it("groups tasks by status and hides archived ones", () => {
    const columns = groupByStatus([task("a", "todo"), task("b", "doing"), task("c", "done"), task("d", "archived"), task("e", "todo")]);

    expect(columns.todo.map((t) => t.id)).toEqual(["a", "e"]);
    expect(columns.doing.map((t) => t.id)).toEqual(["b"]);
    expect(columns.done.map((t) => t.id)).toEqual(["c"]);
  });

  it("returns the new status when dropped on another column", () => {
    expect(statusAfterDrop(task("a", "todo"), "doing")).toBe("doing");
  });

  it("returns null when dropped on its own column, outside any column or on an unknown target", () => {
    expect(statusAfterDrop(task("a", "todo"), "todo")).toBeNull();
    expect(statusAfterDrop(task("a", "todo"), null)).toBeNull();
    expect(statusAfterDrop(task("a", "todo"), "archived")).toBeNull();
  });

  it("recognises board statuses only", () => {
    expect(isBoardStatus("done")).toBe(true);
    expect(isBoardStatus("archived")).toBe(false);
  });
});
