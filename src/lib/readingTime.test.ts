import { describe, expect, it } from "vitest";
import { readingTime } from "./readingTime";

describe("readingTime", () => {
  it("rounds to the nearest minute at 230 wpm", () => {
    expect(readingTime(230)).toBe("1 min read");
    expect(readingTime(1150)).toBe("5 min read");
    expect(readingTime(3122)).toBe("14 min read");
  });

  it("never reports less than a minute", () => {
    expect(readingTime(12)).toBe("1 min read");
  });

  /**
   * NewsAPI reports no word count. Estimating one from a body we never received
   * would be the same mistake as the invented follower counts.
   */
  it("returns nothing when the source gave no count", () => {
    expect(readingTime(null)).toBeNull();
    expect(readingTime(0)).toBeNull();
    expect(readingTime(-5)).toBeNull();
  });
});
