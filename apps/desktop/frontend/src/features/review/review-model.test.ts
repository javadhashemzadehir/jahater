import { describe, expect, it } from "vitest";
import { dayKey, defaultMode } from "./review-model";

describe("review model", () => {
  it("writes the local date as YYYY-MM-DD with padding", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 9, 15, 0, 0))).toBe("2026-10-15");
  });

  it("offers the morning check-in before 3 pm and the evening one after", () => {
    expect(defaultMode(new Date(2026, 9, 15, 8, 0))).toBe("morning");
    expect(defaultMode(new Date(2026, 9, 15, 14, 59))).toBe("morning");
    expect(defaultMode(new Date(2026, 9, 15, 15, 0))).toBe("evening");
    expect(defaultMode(new Date(2026, 9, 15, 22, 0))).toBe("evening");
  });
});
