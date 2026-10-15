import { describe, expect, it } from "vitest";
import { backupDate } from "./backup-model";

describe("backupDate", () => {
  it("shows the day of a daily backup", () => {
    expect(backupDate("backup-2026-10-15.json")).toBe("2026-10-15");
  });

  it("shows the day and time of a safety copy", () => {
    expect(backupDate("pre-import-20261015-083005.json")).toBe("2026-10-15 08:30:05");
  });

  it("leaves an unknown name as it is", () => {
    expect(backupDate("notes.json")).toBe("notes.json");
  });
});
