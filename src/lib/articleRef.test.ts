import { describe, expect, it } from "vitest";
import { articleHref, decodeArticleRef, encodeArticleRef, isSourceId } from "./articleRef";
import { SOURCE_IDS } from "@/domain/article";

describe("article references", () => {
  it("round-trips a Guardian path id", () => {
    const ref = "football/live/2026/aug/14/wolves-v-blackburn-championship-opener-live";
    expect(decodeArticleRef(encodeArticleRef(ref))).toBe(ref);
  });

  it("round-trips a full URL with a query string", () => {
    const ref = "https://example.com/a/b?c=d&e=f#g";
    expect(decodeArticleRef(encodeArticleRef(ref))).toBe(ref);
  });

  it("produces a segment safe to drop into a path", () => {
    // base64url, so no slashes, plus signs or padding to escape.
    const encoded = encodeArticleRef("world/2026/aug/15/a?b=c");
    expect(encoded).not.toMatch(/[/+=]/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("survives non-ASCII characters", () => {
    const ref = "https://example.com/café-münchen-日本";
    expect(decodeArticleRef(encodeArticleRef(ref))).toBe(ref);
  });

  it("returns null for an empty reference", () => {
    expect(decodeArticleRef("")).toBeNull();
  });

  /**
   * Regression: the first implementation used
   * `Buffer.from(x).toString("base64url")`, which works in Node and under
   * Vitest but throws `Unknown encoding: base64url` in a real browser, where
   * Buffer is a polyfill. `articleHref` runs inside Client Components, so every
   * article link on the search and feed pages crashed the page.
   */
  it("works without Node's Buffer, because it runs in the browser too", () => {
    const original = globalThis.Buffer;

    try {
      // @ts-expect-error deliberately removing the Node global for this test
      delete globalThis.Buffer;

      const ref = "sport/live/2026/aug/15/a-story";
      expect(decodeArticleRef(encodeArticleRef(ref))).toBe(ref);
    } finally {
      globalThis.Buffer = original;
    }
  });

  it("rejects malformed input rather than throwing", () => {
    expect(() => decodeArticleRef("!!!not-base64!!!")).not.toThrow();
  });

  it("builds the reader path from an article", () => {
    const href = articleHref({ sourceId: "guardian", providerRef: "world/2026/a" });
    expect(href).toBe(`/article/guardian/${encodeArticleRef("world/2026/a")}`);
  });

  describe("isSourceId", () => {
    it("accepts a real source", () => {
      expect(isSourceId("guardian", SOURCE_IDS)).toBe(true);
    });

    it("rejects anything else, so a hand-typed URL cannot reach a provider lookup", () => {
      expect(isSourceId("bbc", SOURCE_IDS)).toBe(false);
      expect(isSourceId("__proto__", SOURCE_IDS)).toBe(false);
    });
  });
});
