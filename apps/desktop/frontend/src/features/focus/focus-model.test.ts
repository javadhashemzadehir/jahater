import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/tauri";
import { pickCurrentTask } from "./focus-model";

function task(id: string, status: Task["status"] = "todo"): Task {
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

const NOW = Date.parse("2026-10-15T10:30:00.000Z");
const block = (taskId: string | null, startIso: string, durationMin: number, kind = "task") => ({
  taskId,
  startAt: startIso,
  durationMin,
  kind: kind as "task",
});

describe("pickCurrentTask", () => {
  const tasks = [task("a"), task("b", "doing"), task("c")];

  it("prefers the task of the running timer", () => {
    const picked = pickCurrentTask({
      timer: { taskId: "c" },
      blocks: [block("a", "2026-10-15T10:00:00.000Z", 60)],
      tasks,
      nowMs: NOW,
    });
    expect(picked?.id).toBe("c");
  });

  it("keeps showing the timer's task even after it was marked done", () => {
    const picked = pickCurrentTask({ timer: { taskId: "d" }, blocks: [], tasks: [...tasks, task("d", "done")], nowMs: NOW });
    expect(picked?.id).toBe("d");
  });

  it("falls back to the block that covers this moment", () => {
    const picked = pickCurrentTask({
      timer: null,
      blocks: [block("a", "2026-10-15T10:00:00.000Z", 60), block("c", "2026-10-15T12:00:00.000Z", 30)],
      tasks,
      nowMs: NOW,
    });
    expect(picked?.id).toBe("a");
  });

  it("picks the later-starting block when two cover the moment", () => {
    const picked = pickCurrentTask({
      timer: null,
      blocks: [block("a", "2026-10-15T10:00:00.000Z", 120), block("c", "2026-10-15T10:15:00.000Z", 60)],
      tasks,
      nowMs: NOW,
    });
    expect(picked?.id).toBe("c");
  });

  it("ignores buffers, blocks without a task and blocks that have ended or not begun", () => {
    const picked = pickCurrentTask({
      timer: null,
      blocks: [
        block("a", "2026-10-15T10:00:00.000Z", 60, "buffer"),
        block(null, "2026-10-15T10:00:00.000Z", 60),
        block("c", "2026-10-15T09:00:00.000Z", 30),
        block("c", "2026-10-15T11:00:00.000Z", 30),
      ],
      tasks,
      nowMs: NOW,
    });
    expect(picked?.id).toBe("b");
  });

  it("skips a covering block whose task is already done", () => {
    const picked = pickCurrentTask({
      timer: null,
      blocks: [block("d", "2026-10-15T10:00:00.000Z", 60)],
      tasks: [...tasks, task("d", "done")],
      nowMs: NOW,
    });
    expect(picked?.id).toBe("b");
  });

  it("returns null when nothing is current", () => {
    expect(pickCurrentTask({ timer: null, blocks: [], tasks: [task("a")], nowMs: NOW })).toBeNull();
  });
});
