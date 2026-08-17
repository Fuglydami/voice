import { describe, expect, it } from "vitest";
import { formatElapsed, withinRange } from "./dates";

describe("formatElapsed", () => {
  const now = Date.parse("2026-08-15T12:00:00.000Z");

  it.each([
    ["2026-08-15T11:59:40.000Z", "just now"],
    ["2026-08-15T11:46:00.000Z", "14m"],
    ["2026-08-15T09:00:00.000Z", "3h"],
    ["2026-08-13T12:00:00.000Z", "2d"],
    ["2026-08-01T12:00:00.000Z", "2w"],
  ])("formats %s as %s", (iso, expected) => {
    expect(formatElapsed(iso, now)).toBe(expected);
  });

  it("never shows a negative age for a clock-skewed future timestamp", () => {
    expect(formatElapsed("2026-08-15T12:05:00.000Z", now)).toBe("just now");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatElapsed("not a date", now)).toBe("");
  });
});

describe("withinRange", () => {
  it("is inclusive at both ends", () => {
    expect(withinRange("2026-08-05T00:00:00.000Z", "2026-08-05", "2026-08-10")).toBe(true);
    expect(withinRange("2026-08-10T23:59:00.000Z", "2026-08-05", "2026-08-10")).toBe(true);
    expect(withinRange("2026-08-04T23:59:00.000Z", "2026-08-05", "2026-08-10")).toBe(false);
  });
});
