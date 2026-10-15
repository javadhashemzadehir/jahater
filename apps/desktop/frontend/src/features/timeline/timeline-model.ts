// Pure helpers for the daily timeline. All times are local on screen and ISO 8601 UTC in storage.

export const MINUTES_PER_DAY = 24 * 60;
export const SNAP_MINUTES = 5;
/** Vertical scale: one pixel per minute, so a day is 1440px tall. */
export const PX_PER_MINUTE = 1;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** The `[from, to)` range of one local day, as ISO strings for the backend. */
export function dayRange(day: Date): { from: string; to: string } {
  const start = startOfDay(day);
  return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
}

export function minutesIntoDay(iso: string, day: Date): number {
  return (Date.parse(iso) - startOfDay(day).getTime()) / 60000;
}

export function snap(minutes: number, step = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/** The start (ISO) after moving a block by `deltaMinutes`, snapped and kept inside the day. */
export function movedStart(startIso: string, durationMin: number, deltaMinutes: number, day: Date): string {
  const wanted = snap(minutesIntoDay(startIso, day) + deltaMinutes);
  const latest = Math.max(0, MINUTES_PER_DAY - durationMin);
  const clamped = Math.min(Math.max(0, wanted), latest);
  return new Date(startOfDay(day).getTime() + clamped * 60000).toISOString();
}

/** Value for an `<input type="time">`: local HH:MM. */
export function timeInputValue(iso: string): string {
  const date = new Date(iso);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** ISO start for a local HH:MM on `day`, or null when the text is not a valid time. */
export function isoFromTimeInput(day: Date, value: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const start = startOfDay(day);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), hours, minutes).toISOString();
}

export type Geometry = { top: number; height: number };

/** Position inside the day column, clipped to the day. Height has a floor so short blocks stay clickable. */
export function geometry(startIso: string, durationMin: number, day: Date): Geometry {
  const start = minutesIntoDay(startIso, day);
  const end = start + durationMin;
  const top = Math.max(0, start);
  const bottom = Math.min(MINUTES_PER_DAY, end);
  return { top: top * PX_PER_MINUTE, height: Math.max(20, (bottom - top) * PX_PER_MINUTE) };
}

export type Span = { id: string; start: number; end: number };

/**
 * Puts overlapping blocks side by side. Blocks that overlap (directly or through a chain) share
 * a group; inside a group each block gets the first free lane.
 */
export function assignLanes(spans: Span[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const result = new Map<string, { lane: number; lanes: number }>();

  let group: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    for (const item of group) result.set(item.id, { lane: item.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };

  for (const span of sorted) {
    if (span.start >= groupEnd) {
      flush();
      groupEnd = -Infinity;
    }
    let lane = laneEnds.findIndex((end) => end <= span.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.end);
    } else {
      laneEnds[lane] = span.end;
    }
    group.push({ id: span.id, lane });
    groupEnd = Math.max(groupEnd, span.end);
  }
  flush();

  return result;
}
