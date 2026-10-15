import type { Block, Task, Timer } from "@/lib/tauri";

/**
 * The one task focus mode shows. In order of trust:
 * 1. the task of the running timer, 2. the planned block that covers this moment,
 * 3. the first task already marked as doing. Otherwise there is none, and that is fine.
 */
export function pickCurrentTask(input: {
  timer: Pick<Timer, "taskId"> | null;
  blocks: Pick<Block, "taskId" | "startAt" | "durationMin" | "kind">[];
  tasks: Task[];
  nowMs: number;
}): Task | null {
  const open = new Map(
    input.tasks.filter((task) => task.status !== "done" && task.status !== "archived").map((task) => [task.id, task]),
  );

  if (input.timer?.taskId) {
    // The timer's task counts even if it was just marked done: the timer is still running on it.
    const direct = input.tasks.find((task) => task.id === input.timer?.taskId);
    if (direct) return direct;
  }

  const covering = input.blocks
    .filter((block) => block.kind === "task" && block.taskId !== null)
    .filter((block) => {
      const start = Date.parse(block.startAt);
      return start <= input.nowMs && input.nowMs < start + block.durationMin * 60000;
    })
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  for (const block of covering) {
    const task = block.taskId ? open.get(block.taskId) : undefined;
    if (task) return task;
  }

  return input.tasks.find((task) => task.status === "doing") ?? null;
}
