import type { Task } from "@/lib/tauri";

// 1 = urgent + important, 2 = important only, 3 = urgent only, 4 = neither.
export const quadrants = [1, 2, 3, 4] as const;

export type Quadrant = (typeof quadrants)[number];

export type Flags = { isUrgent: boolean; isImportant: boolean };

export function quadrantOf(task: Pick<Task, "isUrgent" | "isImportant">): Quadrant {
  if (task.isImportant) return task.isUrgent ? 1 : 2;
  return task.isUrgent ? 3 : 4;
}

export function flagsFor(quadrant: Quadrant): Flags {
  return {
    isUrgent: quadrant === 1 || quadrant === 3,
    isImportant: quadrant === 1 || quadrant === 2,
  };
}

/** Droppable ids are `q1` to `q4`. */
export function quadrantId(quadrant: Quadrant): string {
  return `q${quadrant}`;
}

export function parseQuadrantId(value: unknown): Quadrant | null {
  const found = quadrants.find((quadrant) => quadrantId(quadrant) === value);
  return found ?? null;
}

/** Open tasks only: done and archived work no longer needs prioritising. */
export function groupByQuadrant(tasks: Task[]): Record<Quadrant, Task[]> {
  const groups: Record<Quadrant, Task[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const task of tasks) {
    if (task.status === "done" || task.status === "archived") continue;
    groups[quadrantOf(task)].push(task);
  }
  return groups;
}

/** The flags a drop should set, or null when nothing changes. */
export function flagsAfterDrop(task: Task, overId: unknown): Flags | null {
  const target = parseQuadrantId(overId);
  if (target === null || target === quadrantOf(task)) return null;
  return flagsFor(target);
}
