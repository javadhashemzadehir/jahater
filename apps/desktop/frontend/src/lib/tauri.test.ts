import { describe, expect, it } from "vitest";
import { createTaskInputSchema, labelSchema, taskSchema, updateTaskInputSchema } from "./tauri";

describe("task IPC schemas", () => {
  it("keeps an omitted field out of an update, and passes null through as a clear", () => {
    const parsed = updateTaskInputSchema.parse({ notes: null });

    expect("title" in parsed).toBe(false);
    expect(parsed.notes).toBeNull();
  });

  it("rejects a zero or fractional estimate before it reaches Rust", () => {
    expect(updateTaskInputSchema.safeParse({ estimateMinutes: 0 }).success).toBe(false);
    expect(createTaskInputSchema.safeParse({ title: "A", estimateMinutes: 1.5 }).success).toBe(false);
    expect(createTaskInputSchema.safeParse({ title: "A", estimateMinutes: 25 }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(updateTaskInputSchema.safeParse({ status: "later" }).success).toBe(false);
  });

  it("lets an update clear the project with null and replace the tag list", () => {
    const parsed = updateTaskInputSchema.parse({ projectId: null, tagIds: ["a", "b"] });

    expect(parsed.projectId).toBeNull();
    expect(parsed.tagIds).toEqual(["a", "b"]);
  });
});

describe("task and label responses", () => {
  const base = {
    id: "1",
    title: "A",
    notes: null,
    status: "todo",
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

  it("accepts a task with a project and tags", () => {
    expect(taskSchema.safeParse({ ...base, projectId: "p", tagIds: ["t"] }).success).toBe(true);
  });

  it("rejects a task that is missing the label fields", () => {
    const withoutTags: Record<string, unknown> = { ...base };
    delete withoutTags.tagIds;
    expect(taskSchema.safeParse(withoutTags).success).toBe(false);
  });

  it("parses a label", () => {
    const label = { id: "1", name: "Home", revision: 1, createdAt: "x", updatedAt: "y" };
    expect(labelSchema.safeParse(label).success).toBe(true);
  });
});
