import { describe, expect, it } from "vitest";
import { formatClock } from "./date";

describe("formatClock", () => {
  it("pads minutes and seconds and drops the hour when it is zero", () => {
    expect(formatClock(0, "en")).toBe("00:00");
    expect(formatClock(5 * 60 + 30, "en")).toBe("05:30");
  });

  it("shows hours without padding once past an hour", () => {
    expect(formatClock(3600 + 5 * 60 + 30, "en")).toBe("1:05:30");
  });

  it("uses Persian digits for fa", () => {
    expect(formatClock(5 * 60 + 30, "fa")).toBe("۰۵:۳۰");
  });

  it("never shows negative time", () => {
    expect(formatClock(-20, "en")).toBe("00:00");
  });
});
