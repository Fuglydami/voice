import { describe, expect, it } from "vitest";
import type { Article, SourceId } from "@/domain/article";
import type { NewsProvider, ProviderCapabilities } from "@/domain/provider";
import { ArticleQuerySchema } from "@/domain/query";
import { aggregate, applyResidualFilters, buildFacets, dedupe, sortArticles } from "./aggregator";

/**
 * These tests never touch the network.
 *
 * That is the payoff of injecting providers rather than importing them: the
 * aggregator can be driven with fakes that fail on demand, return duplicates,
 * or declare different capabilities — none of which is practical against three
 * live rate-limited APIs.
 */

function article(overrides: Partial<Article> = {}): Article {
  return {
    id: "test:1",
    title: "A headline",
    excerpt: "An excerpt",
    url: "https://example.com/a",
    image: null,
    updatedAt: null,
    isLive: false,
    wordCount: null,
    kind: null,
    topics: [],
    publishedAt: "2026-08-10T09:00:00.000Z",
    author: { id: "jane-doe", name: "Jane Doe", avatarUrl: null },
    category: "science",
    sourceId: "newsapi",
    publication: "Example",
    providerRef: "https://example.com/a",
    body: null,
    bodyIsPartial: true,
    ...overrides,
  };
}

function fakeProvider(
  id: SourceId,
  articles: Article[] | Error,
  capabilities: Partial<ProviderCapabilities> = {},
): NewsProvider {
  return {
    id,
    label: id,
    capabilities: {
      keyword: true,
      dateRange: true,
      category: true,
      author: false,
      ...capabilities,
    },
    isConfigured: () => true,
    fetchArticles: async () => {
      if (articles instanceof Error) throw articles;
      return articles;
    },
  };
}

const emptyQuery = ArticleQuerySchema.parse({});

describe("aggregate", () => {
  it("merges results from every provider", async () => {
    const result = await aggregate(
      [
        fakeProvider("guardian", [
          article({ id: "g1", url: "https://a.test/1", title: "From the Guardian" }),
        ]),
        fakeProvider("nyt", [article({ id: "n1", url: "https://b.test/2", title: "From the NYT" })]),
      ],
      emptyQuery,
    );

    expect(result.articles).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.sources.every((source) => source.ok)).toBe(true);
  });

  it("sorts the merged feed newest first", async () => {
    const result = await aggregate(
      [
        fakeProvider("guardian", [
          article({
            id: "old",
            url: "https://a.test/1",
            title: "The older story",
            publishedAt: "2026-08-01T00:00:00.000Z",
          }),
        ]),
        fakeProvider("nyt", [
          article({
            id: "new",
            url: "https://b.test/2",
            title: "The newer story",
            publishedAt: "2026-08-12T00:00:00.000Z",
          }),
        ]),
      ],
      emptyQuery,
    );

    expect(result.articles.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("keeps serving the providers that succeeded when one fails", async () => {
    const result = await aggregate(
      [
        fakeProvider("guardian", [article({ id: "g1", url: "https://a.test/1" })]),
        fakeProvider("nyt", new Error("Rate limit reached")),
      ],
      emptyQuery,
    );

    expect(result.articles).toHaveLength(1);

    const failed = result.sources.find((source) => source.id === "nyt");
    expect(failed?.ok).toBe(false);
    expect(failed?.error).toBe("Rate limit reached");
  });

  it("reports every provider as failed rather than throwing when all fail", async () => {
    const result = await aggregate(
      [
        fakeProvider("guardian", new Error("down")),
        fakeProvider("nyt", new Error("down")),
      ],
      emptyQuery,
    );

    expect(result.articles).toEqual([]);
    expect(result.sources.every((source) => !source.ok)).toBe(true);
  });

  it("paginates the merged feed", async () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      article({
        id: `a${index}`,
        url: `https://a.test/${index}`,
        title: `Headline ${index}`,
        publishedAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
      }),
    );

    const result = await aggregate(
      [fakeProvider("guardian", many)],
      ArticleQuerySchema.parse({ page: "2", pageSize: "4" }),
    );

    expect(result.articles).toHaveLength(4);
    expect(result.total).toBe(10);
    expect(result.page).toBe(2);
  });

  it("applies filters in-memory for a provider that cannot filter upstream", async () => {
    // Two providers, same data, but only one can filter by category upstream.
    // Both must return the same thing — that is Liskov substitutability.
    const articles = [
      article({ id: "s", url: "https://a.test/1", category: "sports" }),
      article({ id: "h", url: "https://a.test/2", category: "health" }),
    ];

    const incapable = await aggregate(
      [fakeProvider("newsapi", articles, { category: false })],
      ArticleQuerySchema.parse({ categories: "sports" }),
    );

    expect(incapable.articles.map((item) => item.id)).toEqual(["s"]);
  });
});

describe("source filtering", () => {
  const guardianArticles = [
    article({ id: "g1", url: "https://a.test/1", title: "One", sourceId: "guardian" }),
    article({ id: "g2", url: "https://a.test/2", title: "Two", sourceId: "guardian" }),
  ];
  const nytArticles = [
    article({ id: "n1", url: "https://b.test/1", title: "Three", sourceId: "nyt" }),
  ];

  it("returns only the chosen source", async () => {
    // The aggregator is handed every configured provider and narrows the result
    // itself, so that faceting still sees the sources the reader excluded.
    const result = await aggregate(
      [fakeProvider("guardian", guardianArticles)],
      ArticleQuerySchema.parse({ sources: "guardian" }),
    );

    expect(result.total).toBe(2);
    expect(result.articles.every((item) => item.sourceId === "guardian")).toBe(true);
  });

  it("merges several chosen sources", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", guardianArticles), fakeProvider("nyt", nytArticles)],
      ArticleQuerySchema.parse({ sources: "guardian,nyt" }),
    );

    expect(result.total).toBe(3);
  });

  it("reports a per-source count in the facets", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", guardianArticles), fakeProvider("nyt", nytArticles)],
      emptyQuery,
    );

    expect(result.facets.sources).toEqual([
      { value: "guardian", label: "guardian", count: 2 },
      { value: "nyt", label: "nyt", count: 1 },
    ]);
  });

  it("marks an unavailable source in its facet label", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", guardianArticles), fakeProvider("nyt", new Error("down"))],
      emptyQuery,
    );

    expect(result.facets.sources[1]).toMatchObject({ value: "nyt", count: 0 });
    expect(result.facets.sources[1]?.label).toContain("unavailable");
  });

  /**
   * Regression: the route used to narrow the *fetch* to the selected sources,
   * so the response could only ever describe those. Picking "The Guardian"
   * erased NewsAPI and the NYT from the filter panel entirely — there was no
   * way to switch source or add a second one without clearing the filter first.
   * The filter is now applied after faceting, as the author filter already was.
   */
  it("keeps every source visible, with counts, after one is chosen", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", guardianArticles), fakeProvider("nyt", nytArticles)],
      ArticleQuerySchema.parse({ sources: "guardian" }),
    );

    expect(result.facets.sources).toEqual([
      { value: "guardian", label: "guardian", count: 2 },
      { value: "nyt", label: "nyt", count: 1 },
    ]);
    // ...while the results themselves are narrowed as asked.
    expect(result.articles.every((item) => item.sourceId === "guardian")).toBe(true);
    expect(result.total).toBe(2);
  });

  it("keeps sources in registry order rather than by count", async () => {
    // Three fixed sources that reshuffle on every search would be harder to
    // use, not easier.
    const result = await aggregate(
      [fakeProvider("nyt", nytArticles), fakeProvider("guardian", guardianArticles)],
      emptyQuery,
    );

    expect(result.facets.sources.map((facet) => facet.value)).toEqual(["nyt", "guardian"]);
  });
});

describe("author filtering", () => {
  // `sourceId` matches the provider returning them, as it always does in
  // production: every mapper stamps its own id onto the articles it maps.
  const mixed = [
    article({ id: "1", url: "https://a.test/1", title: "One", sourceId: "guardian" }),
    article({
      id: "2",
      url: "https://a.test/2",
      title: "Two",
      sourceId: "guardian",
      author: { id: "john-roe", name: "John Roe", avatarUrl: null },
    }),
    article({
      id: "3",
      url: "https://a.test/3",
      title: "Three",
      sourceId: "guardian",
      author: { id: "john-roe", name: "John Roe", avatarUrl: null },
    }),
  ];

  it("filters to the chosen author", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", mixed)],
      ArticleQuerySchema.parse({ authors: "john-roe" }),
    );

    expect(result.articles.map((item) => item.id)).toEqual(["2", "3"]);
    expect(result.total).toBe(2);
  });

  /**
   * Regression: the author filter used to run inside `applyResidualFilters`,
   * before the facets were built. Clicking an author therefore left an author
   * list containing only that author, with no way to switch to another or widen
   * back out. It is now applied after faceting, as the source filter already was.
   */
  it("keeps every author visible in the facets after one is chosen", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", mixed)],
      ArticleQuerySchema.parse({ authors: "john-roe" }),
    );

    expect(result.facets.authors.map((facet) => facet.value)).toEqual(["john-roe", "jane-doe"]);
  });

  it("still reports full source counts when an author filter is active", async () => {
    const result = await aggregate(
      [fakeProvider("guardian", mixed)],
      ArticleQuerySchema.parse({ authors: "john-roe" }),
    );

    expect(result.facets.sources[0]).toMatchObject({ value: "guardian", count: 3 });
  });
});

describe("buildFacets", () => {
  const articles = [
    article({ id: "1", url: "https://a.test/1", title: "One", publication: "BBC News" }),
    article({ id: "2", url: "https://a.test/2", title: "Two", publication: "BBC News" }),
    article({ id: "3", url: "https://a.test/3", title: "Three", publication: "Reuters" }),
  ];

  /**
   * Counts come from the deduped articles, not from each provider's raw return.
   * A story carried by two sources is one row on screen, so summing the raw
   * per-provider totals promised more results than clicking could deliver: the
   * three source counts added up to 87 against a stated total of 83.
   *
   * Taking them from the articles is only safe because every configured
   * provider is queried on every request — see `aggregate`. If the fetch were
   * narrowed to the selected sources, this would zero out the others and make
   * the filter impossible to widen again.
   */
  it("takes source counts from the deduped articles, not each provider's raw total", () => {
    const facets = buildFacets(
      [
        article({ id: "1", url: "https://a.test/1", sourceId: "guardian" }),
        article({ id: "2", url: "https://a.test/2", sourceId: "guardian" }),
        article({ id: "3", url: "https://a.test/3", sourceId: "nyt" }),
      ],
      [
        // Raw totals deliberately inflated: two of these were duplicates that
        // dedupe already removed, so the facet must not repeat the claim.
        { id: "guardian", label: "The Guardian", configured: true, ok: true, count: 40 },
        { id: "nyt", label: "The New York Times", configured: true, ok: true, count: 10 },
      ],
    );

    expect(facets.sources).toEqual([
      { value: "guardian", label: "The Guardian", count: 2 },
      { value: "nyt", label: "The New York Times", count: 1 },
    ]);
  });

  it("labels categories for display rather than exposing the raw key", () => {
    const facets = buildFacets([article({ category: "technology" })]);
    expect(facets.categories[0]).toMatchObject({ value: "technology", label: "Technology" });
  });

  it("counts authors by their slug", () => {
    const facets = buildFacets(articles);
    expect(facets.authors[0]).toMatchObject({ value: "jane-doe", label: "Jane Doe", count: 3 });
  });

  it("returns empty facets for an empty result set", () => {
    expect(buildFacets([])).toEqual({ sources: [], categories: [], authors: [] });
  });
});

describe("sortArticles", () => {
  const older = article({ id: "older", publishedAt: "2026-08-01T00:00:00.000Z", title: "Boxing" });
  const newer = article({ id: "newer", publishedAt: "2026-08-12T00:00:00.000Z", title: "Cricket" });

  it("sorts newest first by default", () => {
    expect(sortArticles([older, newer], "newest", "").map((a) => a.id)).toEqual(["newer", "older"]);
  });

  it("sorts oldest first when asked", () => {
    expect(sortArticles([older, newer], "oldest", "").map((a) => a.id)).toEqual(["older", "newer"]);
  });

  it("ranks a title match above a recent article when sorting by relevance", () => {
    expect(sortArticles([newer, older], "relevance", "boxing").map((a) => a.id)).toEqual([
      "older",
      "newer",
    ]);
  });

  it("falls back to recency when relevance is asked for without a keyword", () => {
    expect(sortArticles([older, newer], "relevance", "").map((a) => a.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [older, newer];
    sortArticles(input, "oldest", "");
    expect(input.map((a) => a.id)).toEqual(["older", "newer"]);
  });
});

describe("applyResidualFilters", () => {
  const capable = fakeProvider("guardian", []);
  const incapable = fakeProvider("newsapi", [], {
    keyword: false,
    dateRange: false,
    category: false,
  });

  it("leaves results alone when the provider already filtered upstream", () => {
    const input = [article({ category: "sports" })];
    const query = ArticleQuerySchema.parse({ categories: "health" });

    expect(applyResidualFilters(input, query, capable)).toHaveLength(1);
  });

  it("filters by keyword across title, excerpt, author and publication", () => {
    const input = [
      article({ id: "1", title: "Boxing tonight" }),
      article({ id: "2", title: "Something else", excerpt: "about boxing" }),
      article({ id: "3", title: "Unrelated", excerpt: "unrelated" }),
    ];

    const result = applyResidualFilters(input, ArticleQuerySchema.parse({ q: "boxing" }), incapable);
    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("filters by an inclusive date range", () => {
    const input = [
      article({ id: "before", publishedAt: "2026-08-01T00:00:00.000Z" }),
      article({ id: "inside", publishedAt: "2026-08-10T00:00:00.000Z" }),
      article({ id: "after", publishedAt: "2026-08-20T00:00:00.000Z" }),
    ];

    const result = applyResidualFilters(
      input,
      ArticleQuerySchema.parse({ from: "2026-08-05", to: "2026-08-15" }),
      incapable,
    );

    expect(result.map((item) => item.id)).toEqual(["inside"]);
  });

  /**
   * The author filter is deliberately NOT applied here. It runs in `aggregate`
   * after the facets are built, so that selecting one author does not wipe every
   * other author out of the filter list. See the "author filtering" suite for
   * the behaviour callers actually observe.
   */
  it("leaves the author filter alone, since faceting has to see every author", () => {
    const input = [
      article({ id: "1", author: { id: "jane-doe", name: "Jane Doe", avatarUrl: null } }),
      article({ id: "2", author: { id: "john-roe", name: "John Roe", avatarUrl: null } }),
    ];

    const result = applyResidualFilters(
      input,
      ArticleQuerySchema.parse({ authors: "jane-doe" }),
      capable,
    );

    expect(result.map((item) => item.id)).toEqual(["1", "2"]);
  });
});

describe("dedupe", () => {
  it("removes the same url arriving twice, ignoring tracking params", () => {
    const result = dedupe([
      article({ id: "1", url: "https://example.com/story" }),
      article({ id: "2", url: "https://example.com/story?utm_source=twitter" }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("removes syndicated copy published under different urls", () => {
    const result = dedupe([
      article({ id: "1", url: "https://a.test/1", title: "Fury to retire?" }),
      article({ id: "2", url: "https://b.test/2", title: "FURY TO RETIRE?" }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("keeps genuinely distinct stories", () => {
    const result = dedupe([
      article({ id: "1", url: "https://a.test/1", title: "One" }),
      article({ id: "2", url: "https://b.test/2", title: "Two" }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("ignores a trailing slash difference", () => {
    const result = dedupe([
      article({ id: "1", url: "https://a.test/story/", title: "One" }),
      article({ id: "2", url: "https://a.test/story", title: "Two" }),
    ]);

    expect(result).toHaveLength(1);
  });
});
