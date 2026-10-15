import type { Task, TaskStatus } from "@/lib/tauri";

// Archived tasks are hidden from the board; they have no column.
export const boardStatuses = ["todo", "doing", "done"] as const satisfies readonly TaskStatus[];

export type BoardStatus = (typeof boardStatuses)[number];

export function isBoardStatus(value: unknown): value is BoardStatus {
  return typeof value === "string" && (boardStatuses as readonly string[]).includes(value);
}

/** Groups tasks into the board columns. Order inside a column follows the backend order. */
export function groupByStatus(tasks: Task[]): Record<BoardStatus, Task[]> {
  const columns: Record<BoardStatus, Task[]> = { todo: [], doing: [], done: [] };
  for (const task of tasks) {
    if (isBoardStatus(task.status)) columns[task.status].push(task);
  }
  return columns;
}

/** The status a drop should set, or null when nothing changes (same column or an unknown target). */
export function statusAfterDrop(task: Task, overId: unknown): BoardStatus | null {
  if (!isBoardStatus(overId) || overId === task.status) return null;
  return overId;
}
