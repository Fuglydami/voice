import { describe, expect, it } from "vitest";
import type { Article } from "@/domain/article";
import { formatArticleCount, trendingAuthors } from "./trending";

function article(author: string, publishedAt: string, overrides: Partial<Article> = {}): Article {
  return {
    id: `${author}-${publishedAt}`,
    title: `Story by ${author}`,
    excerpt: "",
    url: `https://example.com/${author}-${publishedAt}`,
    image: null,
    updatedAt: null,
    isLive: false,
    wordCount: null,
    kind: null,
    topics: [],
    publishedAt,
    author: {
      id: author.toLowerCase().replace(/\s+/g, "-"),
      name: author,
      avatarUrl: null,
    },
    category: "world",
    sourceId: "guardian",
    publication: "The Guardian",
    providerRef: "ref",
    body: null,
    bodyIsPartial: true,
    ...overrides,
  };
}

describe("trendingAuthors", () => {
  it("ranks by article count", () => {
    const result = trendingAuthors([
      article("Zoe Vance", "2026-08-15T09:00:00.000Z"),
      article("Alan Booth", "2026-08-15T08:00:00.000Z"),
      article("Zoe Vance", "2026-08-15T10:00:00.000Z"),
    ]);

    expect(result[0]).toMatchObject({ name: "Zoe Vance", articleCount: 2 });
  });

  /**
   * Regression, and the reason this file exists.
   *
   * Ties used to break on `localeCompare`. In a real feed of ~80 articles
   * almost every byline appears exactly once, so the tie-break decided nearly
   * the entire list and the rail rendered as an alphabetical run of A-names.
   * Ties now break on recency, which is an actual trend signal.
   */
  it("breaks ties on recency, not alphabetically", () => {
    const result = trendingAuthors([
      article("Aaron Abbott", "2026-08-15T06:00:00.000Z"),
      article("Zoe Vance", "2026-08-15T11:00:00.000Z"),
      article("Bella Cruz", "2026-08-15T09:00:00.000Z"),
    ]);

    expect(result.map((author) => author.name)).toEqual([
      "Zoe Vance",
      "Bella Cruz",
      "Aaron Abbott",
    ]);
  });

  it("counts an author's most recent article as their timestamp", () => {
    const result = trendingAuthors([
      article("Zoe Vance", "2026-08-15T06:00:00.000Z"),
      article("Zoe Vance", "2026-08-15T14:00:00.000Z"),
    ]);

    expect(result[0]?.latestPublishedAt).toBe("2026-08-15T14:00:00.000Z");
  });

  it("prefers the record that carries a headshot", () => {
    const withPhoto = article("Zoe Vance", "2026-08-15T06:00:00.000Z");
    withPhoto.author = { ...withPhoto.author, avatarUrl: "https://cdn.test/zoe.jpg" };

    const result = trendingAuthors([article("Zoe Vance", "2026-08-15T07:00:00.000Z"), withPhoto]);

    expect(result[0]?.avatarUrl).toBe("https://cdn.test/zoe.jpg");
  });

  describe("bylines that are not people", () => {
    it("drops a byline identical to the publication", () => {
      const result = trendingAuthors([
        article("CBS News", "2026-08-15T09:00:00.000Z", { publication: "CBS News" }),
        article("Zoe Vance", "2026-08-15T08:00:00.000Z"),
      ]);

      expect(result.map((author) => author.name)).toEqual(["Zoe Vance"]);
    });

    it("drops desk and wire-service names", () => {
      const result = trendingAuthors([
        article("Editorial", "2026-08-15T09:00:00.000Z"),
        article("Reuters", "2026-08-15T09:00:00.000Z"),
        article("Guardian Staff", "2026-08-15T09:00:00.000Z"),
        article("ABC News - Breaking News", "2026-08-15T09:00:00.000Z"),
        article("Zoe Vance", "2026-08-15T08:00:00.000Z"),
      ]);

      expect(result.map((author) => author.name)).toEqual(["Zoe Vance"]);
    });

    it("drops single-word bylines, which are desks rather than people", () => {
      const result = trendingAuthors([
        article("Newsroom", "2026-08-15T09:00:00.000Z"),
        article("Zoe Vance", "2026-08-15T08:00:00.000Z"),
      ]);

      expect(result.map((author) => author.name)).toEqual(["Zoe Vance"]);
    });
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      article(`Writer ${index}`, `2026-08-15T0${index % 10}:00:00.000Z`),
    );

    expect(trendingAuthors(many, 4)).toHaveLength(4);
  });

  it("returns nothing for an empty feed", () => {
    expect(trendingAuthors([])).toEqual([]);
  });
});

describe("formatArticleCount", () => {
  it("singularises one story", () => {
    expect(formatArticleCount(1)).toBe("1 story");
    expect(formatArticleCount(3)).toBe("3 stories");
  });
});

describe("desk bylines built from the masthead", () => {
  /**
   * "Guardian sport" passes every other test: two words, not an exact match for
   * the publication, not on the explicit list. It is still a desk, not a person.
   */
  it("drops a byline whose first word is part of the publication name", () => {
    const result = trendingAuthors([
      article("Guardian sport", "2026-08-16T09:00:00.000Z"),
      article("Zoe Vance", "2026-08-16T08:00:00.000Z"),
    ]);

    expect(result.map((author) => author.name)).toEqual(["Zoe Vance"]);
  });

  it("keeps a real person whose surname merely resembles the outlet", () => {
    // "Times" is short enough to be a plausible surname fragment, so the rule
    // only fires on the FIRST word and only above three characters.
    const result = trendingAuthors([article("Jonathan Guard", "2026-08-16T09:00:00.000Z")]);
    expect(result.map((author) => author.name)).toEqual(["Jonathan Guard"]);
  });
});
