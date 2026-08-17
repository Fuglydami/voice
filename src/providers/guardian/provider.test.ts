import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests are about the *request*, not the response.
 *
 * The Guardian returns only the fields you ask for. A field the mapper reads
 * but the request never listed comes back null — no error, no warning, just
 * missing data downstream. That failure mode has bitten this provider more than
 * once, most recently when the reader endpoint asked for a narrower set than
 * search and quietly dropped every article's topics, image credit and live
 * state. Asserting on the built URL is the only place that drift is visible.
 */

vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  serverEnv: { newsapiKey: "", guardianKey: "test-key", nytKey: "" },
}));

const okSearch = {
  response: { status: "ok", results: [] },
};

const okItem = {
  response: { status: "ok", content: null },
};

let requestedUrls: string[] = [];

beforeEach(() => {
  requestedUrls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      return new Response(JSON.stringify(url.includes("/search") ? okSearch : okItem), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** `show-fields=a,b,c` → `["a","b","c"]` for the given parameter. */
function listParam(url: string, name: string): string[] {
  const value = new URL(url).searchParams.get(name);
  return value ? value.split(",") : [];
}

const emptyQuery = {
  q: "",
  sources: [],
  categories: [],
  authors: [],
  from: undefined,
  to: undefined,
  sort: "newest",
} as never;

describe("guardianProvider request construction", () => {
  it("asks for every field the reader page needs, not a subset of search", async () => {
    const { guardianProvider } = await import("./provider");

    await guardianProvider.fetchArticles(emptyQuery, AbortSignal.timeout(1000));
    const searchUrl = requestedUrls.at(-1)!;

    await guardianProvider.fetchArticle!("world/2026/aug/14/story", AbortSignal.timeout(1000));
    const itemUrl = requestedUrls.at(-1)!;

    for (const param of ["show-fields", "show-tags", "show-elements"]) {
      const searched = listParam(searchUrl, param);
      const fetched = listParam(itemUrl, param);

      expect(searched.length).toBeGreaterThan(0);
      // The reader may ask for more (it adds `body`) but never for less.
      expect(fetched).toEqual(expect.arrayContaining(searched));
    }
  });

  it("requests the article body only for a single article", async () => {
    const { guardianProvider } = await import("./provider");

    await guardianProvider.fetchArticles(emptyQuery, AbortSignal.timeout(1000));
    expect(listParam(requestedUrls.at(-1)!, "show-fields")).not.toContain("body");

    await guardianProvider.fetchArticle!("world/2026/aug/14/story", AbortSignal.timeout(1000));
    expect(listParam(requestedUrls.at(-1)!, "show-fields")).toContain("body");
  });

  it("requests the tags and elements the mapper reads", async () => {
    const { guardianProvider } = await import("./provider");
    await guardianProvider.fetchArticles(emptyQuery, AbortSignal.timeout(1000));
    const url = requestedUrls.at(-1)!;

    // `keyword` feeds topics, `image` feeds alt text, caption and credit.
    expect(listParam(url, "show-tags")).toContain("keyword");
    expect(listParam(url, "show-elements")).toContain("image");
    expect(listParam(url, "show-fields")).toContain("liveBloggingNow");
  });
});
