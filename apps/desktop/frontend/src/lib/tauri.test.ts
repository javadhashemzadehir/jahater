import { describe, expect, it } from "vitest";
import { createTaskInputSchema, updateTaskInputSchema } from "./tauri";

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
});
