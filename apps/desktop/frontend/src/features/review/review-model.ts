export type ReviewMode = "morning" | "evening";

/** Local date as YYYY-MM-DD, the key the backend stores a review under. */
export function dayKey(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/** Before 3 pm the morning check-in is the natural one; later in the day, the evening one. */
export function defaultMode(now: Date): ReviewMode {
  return now.getHours() < 15 ? "morning" : "evening";
}
