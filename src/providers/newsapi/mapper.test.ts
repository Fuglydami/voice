import { describe, expect, it } from "vitest";
import { mapNewsApiArticle } from "./mapper";
import type { NewsApiArticle } from "./schema";

/**
 * Mapper tests use payloads shaped like real NewsAPI responses, including the
 * awkward cases that actually occur in production: removed articles, email
 * bylines, protocol-relative images and publication suffixes on headlines.
 */

const base: NewsApiArticle = {
  source: { id: "bbc-news", name: "BBC News" },
  author: "Jane Doe",
  title: "Central bank holds rates steady - BBC News",
  description: "<p>Policymakers signalled two cuts &amp; a review.</p>",
  url: "https://bbc.co.uk/news/business-123",
  urlToImage: "https://ichef.bbci.co.uk/news/1024/image.jpg",
  publishedAt: "2026-08-10T09:30:00Z",
  content: null,
};

describe("mapNewsApiArticle", () => {
  it("maps a well-formed article into the domain model", () => {
    const article = mapNewsApiArticle(base);

    expect(article).not.toBeNull();
    expect(article?.sourceId).toBe("newsapi");
    expect(article?.publication).toBe("BBC News");
    expect(article?.url).toBe("https://bbc.co.uk/news/business-123");
    expect(article?.publishedAt).toBe("2026-08-10T09:30:00.000Z");
  });

  it("strips the publication suffix from the headline", () => {
    expect(mapNewsApiArticle(base)?.title).toBe("Central bank holds rates steady");
  });

  it("decodes entities and strips markup from the excerpt", () => {
    expect(mapNewsApiArticle(base)?.excerpt).toBe("Policymakers signalled two cuts & a review.");
  });

  it("infers a category when the endpoint provides none", () => {
    expect(mapNewsApiArticle(base)?.category).toBe("economy");
  });

  it("gives the same article the same id across calls", () => {
    expect(mapNewsApiArticle(base)?.id).toBe(mapNewsApiArticle(base)?.id);
  });

  it("rejects records without a url or title", () => {
    expect(mapNewsApiArticle({ ...base, url: null })).toBeNull();
    expect(mapNewsApiArticle({ ...base, title: null })).toBeNull();
  });

  it("rejects NewsAPI's [Removed] placeholder articles", () => {
    expect(mapNewsApiArticle({ ...base, title: "[Removed]" })).toBeNull();
  });

  describe("byline cleaning", () => {
    it("unwraps an email-style byline", () => {
      const article = mapNewsApiArticle({ ...base, author: "jane@paper.com (Jane Doe)" });
      expect(article?.author.name).toBe("Jane Doe");
      expect(article?.author.id).toBe("jane-doe");
    });

    it("keeps only the first of several authors", () => {
      expect(mapNewsApiArticle({ ...base, author: "Jane Doe, John Smith" })?.author.name).toBe(
        "Jane Doe",
      );
    });

    it("drops the leading 'By'", () => {
      expect(mapNewsApiArticle({ ...base, author: "By Jane Doe" })?.author.name).toBe("Jane Doe");
    });

    it("falls back to the publication when the byline is missing or unusable", () => {
      expect(mapNewsApiArticle({ ...base, author: null })?.author.name).toBe("BBC News");
      expect(mapNewsApiArticle({ ...base, author: "https://example.com" })?.author.name).toBe(
        "BBC News",
      );
    });
  });

  describe("image handling", () => {
    it("upgrades a protocol-relative url to https", () => {
      expect(mapNewsApiArticle({ ...base, urlToImage: "//cdn.example/a.jpg" })?.image?.url).toBe(
        "https://cdn.example/a.jpg",
      );
    });

    it("drops plain http images rather than letting the optimiser reject them", () => {
      expect(mapNewsApiArticle({ ...base, urlToImage: "http://cdn.example/a.jpg" })?.image).toBeNull();
    });

    it("tolerates a missing image", () => {
      expect(mapNewsApiArticle({ ...base, urlToImage: null })?.image).toBeNull();
    });
  });

  it("falls back to the current time for an unparseable date", () => {
    const article = mapNewsApiArticle({ ...base, publishedAt: "not a date" });
    expect(Number.isNaN(Date.parse(article!.publishedAt))).toBe(false);
  });
});
