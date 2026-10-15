import type { Task, TrackedEntry } from "@/lib/tauri";

export const groupings = ["task", "day", "project", "tag"] as const;

export type Grouping = (typeof groupings)[number];

/** Rows without a task, project or tag fall into this group. */
export const NONE_KEY = "none";

export type ReportRow = {
  key: string;
  /** Task, project or tag id, or null for the "none" group and for days. */
  refId: string | null;
  /** Sum of the estimates of the distinct tasks in the group. */
  estimateMinutes: number;
  actualSeconds: number;
};

export type Report = {
  rows: ReportRow[];
  total: { estimateMinutes: number; actualSeconds: number };
};

/** Local calendar day of an ISO timestamp, as YYYY-MM-DD. */
export function localDayKey(iso: string): string {
  const date = new Date(iso);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export function dayFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Compares planned and tracked time. Actual time comes from the backend (pauses already
 * excluded). A task's estimate counts once per group, so tracking the same task twice does not
 * double its estimate. With `tag` grouping a task appears under each of its tags, so the group
 * rows can add up to more than the total.
 */
export function buildReport(entries: TrackedEntry[], tasks: Task[], grouping: Grouping): Report {
  const byId = new Map(tasks.map((task) => [task.id, task]));

  type Bucket = { refId: string | null; taskIds: Set<string>; actualSeconds: number };
  const buckets = new Map<string, Bucket>();
  const firstDayOfTask = new Map<string, string>();

  if (grouping === "day") {
    for (const entry of entries) {
      if (!entry.taskId) continue;
      const day = localDayKey(entry.startedAt);
      const seen = firstDayOfTask.get(entry.taskId);
      if (seen === undefined || day < seen) firstDayOfTask.set(entry.taskId, day);
    }
  }

  function add(key: string, refId: string | null, entry: TrackedEntry, countEstimate: boolean) {
    const bucket = buckets.get(key) ?? { refId, taskIds: new Set<string>(), actualSeconds: 0 };
    bucket.actualSeconds += entry.actualSeconds;
    if (entry.taskId && countEstimate) bucket.taskIds.add(entry.taskId);
    buckets.set(key, bucket);
  }

  for (const entry of entries) {
    const task = entry.taskId ? byId.get(entry.taskId) : undefined;

    switch (grouping) {
      case "task":
        add(entry.taskId ?? NONE_KEY, entry.taskId, entry, true);
        break;
      case "day": {
        const day = localDayKey(entry.startedAt);
        add(day, null, entry, entry.taskId !== null && firstDayOfTask.get(entry.taskId) === day);
        break;
      }
      case "project":
        add(task?.projectId ?? NONE_KEY, task?.projectId ?? null, entry, true);
        break;
      case "tag": {
        const tagIds = task?.tagIds ?? [];
        if (tagIds.length === 0) add(NONE_KEY, null, entry, true);
        for (const tagId of tagIds) add(tagId, tagId, entry, true);
        break;
      }
    }
  }

  const estimateOf = (taskIds: Iterable<string>) => {
    let sum = 0;
    for (const id of taskIds) sum += byId.get(id)?.estimateMinutes ?? 0;
    return sum;
  };

  const rows: ReportRow[] = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    refId: bucket.refId,
    estimateMinutes: estimateOf(bucket.taskIds),
    actualSeconds: bucket.actualSeconds,
  }));

  rows.sort((a, b) => (grouping === "day" ? a.key.localeCompare(b.key) : b.actualSeconds - a.actualSeconds || a.key.localeCompare(b.key)));

  const allTaskIds = new Set(entries.flatMap((entry) => (entry.taskId ? [entry.taskId] : [])));
  return {
    rows,
    total: {
      estimateMinutes: estimateOf(allTaskIds),
      actualSeconds: entries.reduce((sum, entry) => sum + entry.actualSeconds, 0),
    },
  };
}

/** Actual minus estimate, in whole minutes, or null when there is no estimate to compare with. */
export function differenceMinutes(estimateMinutes: number, actualSeconds: number): number | null {
  if (estimateMinutes === 0) return null;
  return Math.round(actualSeconds / 60) - estimateMinutes;
}

export const reportRanges = [1, 7, 30] as const;

export type ReportRange = (typeof reportRanges)[number];

/** `[from, to)` covering the last `days` local days, today included. */
export function rangeFor(days: ReportRange, today: Date): { from: string; to: string } {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
