import { z } from "zod";

/**
 * The single article shape the whole application speaks. Every vendor field name
 * dies at that provider's mapper; nothing downstream ever sees one.
 */

/** Canonical categories. Each provider maps its own taxonomy onto these. */
export const CATEGORIES = [
  "general",
  "world",
  "politics",
  "sports",
  "economy",
  "culture",
  "technology",
  "science",
  "health",
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  // "general" is the fallback for anything unclassifiable. It is deliberately
  // kept out of the navigation: it is a bucket, not a section a reader chooses.
  general: "General",
  world: "World",
  politics: "Politics",
  sports: "Sports",
  economy: "Economy",
  culture: "Culture",
  technology: "Technology",
  science: "Science",
  health: "Health",
};

/** The three data sources, all chosen from the list in the challenge brief. */
export const SOURCE_IDS = ["newsapi", "guardian", "nyt"] as const;

export const SourceIdSchema = z.enum(SOURCE_IDS);
export type SourceId = z.infer<typeof SourceIdSchema>;

export const SOURCE_LABELS: Record<SourceId, string> = {
  newsapi: "NewsAPI",
  guardian: "The Guardian",
  nyt: "The New York Times",
};

export const AuthorSchema = z.object({
  /** Slug derived from the name — stable enough to use as a preference key. */
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
});
export type Author = z.infer<typeof AuthorSchema>;

/**
 * An article's lead image. Not a bare URL: the Guardian and NYT both return real
 * alt text, a caption and a credit, and dimensions the layout needs to avoid
 * guessing an aspect ratio and shifting on load.
 */
export const ArticleImageSchema = z.object({
  url: z.string().url(),
  /** The publisher's own alt text. Null when they did not supply any. */
  alt: z.string().nullable(),
  caption: z.string().nullable(),
  /** Photographer or agency, e.g. "Reed Saxon/Associated Press". */
  credit: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});
export type ArticleImage = z.infer<typeof ArticleImageSchema>;

/**
 * What kind of piece this is. The NYT states it in `type_of_material`, the
 * Guardian implies it through `tone/*` tags. A feed that renders an obituary and
 * an opinion column identically is misleading about both.
 */
export const ARTICLE_KINDS = ["news", "opinion", "review", "obituary", "analysis", "live"] as const;
export const ArticleKindSchema = z.enum(ARTICLE_KINDS);
export type ArticleKind = z.infer<typeof ArticleKindSchema>;

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  news: "News",
  opinion: "Opinion",
  review: "Review",
  obituary: "Obituary",
  analysis: "Analysis",
  live: "Live",
};

export const ArticleSchema = z.object({
  /** `${sourceId}:${hash of canonical url}` — stable across refetches. */
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  url: z.string().url(),
  image: ArticleImageSchema.nullable(),
  /** ISO 8601, always UTC. First publication. */
  publishedAt: z.string(),
  /** Last modification. Live blogs are the reason: one updated two minutes ago
   * was being shown with a five-hour-old publication time. */
  updatedAt: z.string().nullable(),
  /** True while a live blog is still being updated. */
  isLive: z.boolean(),
  /** Article length, for a reading-time estimate. Null when unknown. */
  wordCount: z.number().nullable(),
  /** Reporting, comment, review, obituary. Null when the source does not say. */
  kind: ArticleKindSchema.nullable(),
  /** Publisher topic tags, e.g. ["Hurricanes", "Hawaii"]. */
  topics: z.array(z.string()),
  author: AuthorSchema,
  category: CategorySchema,
  /** Which provider returned it. */
  sourceId: SourceIdSchema,
  /** The originating publication, e.g. "BBC News" — distinct from the provider. */
  publication: z.string(),

  /** Used to re-fetch this article: a path id for the Guardian, the URL otherwise. */
  providerRef: z.string(),

  /**
   * Article text, as much as the source gives: a complete HTML body from the
   * Guardian, an abstract only from the NYT, and ~200 truncated characters from
   * NewsAPI's free tier.
   */
  body: z.string().nullable(),
  /** True when `body` is a fragment rather than the whole article. */
  bodyIsPartial: z.boolean(),
});
export type Article = z.infer<typeof ArticleSchema>;

/** Per-provider outcome, so partial failures can be surfaced instead of hidden. */
export interface SourceStatus {
  id: SourceId;
  label: string;
  configured: boolean;
  ok: boolean;
  count: number;
  error?: string;
}

/**
 * A filterable value plus how many articles carry it.
 *
 * Counts are what make a filter usable rather than a guess: "The Guardian (34)"
 * tells the reader the click is worth making, and a facet with zero matches can
 * be hidden instead of leading to an empty page.
 */
export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface ArticleFacets {
  /** The three data sources, with how many articles each contributed. */
  sources: Facet[];
  /** Canonical categories present in the result set. */
  categories: Facet[];
  /** Bylines present in the result set. */
  authors: Facet[];
}

export interface ArticlesResponse {
  articles: Article[];
  sources: SourceStatus[];
  facets: ArticleFacets;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * A trending author derived from the articles in hand.
 *
 * Both fields are real. An earlier version carried a `followers` count derived
 * from a hash of the author's id, which was invented data dressed up as a
 * metric; it has been replaced with the article count and the timestamp that
 * actually drive the ranking.
 */
export interface TrendingAuthor extends Author {
  /** How many articles this author has in the current feed. */
  articleCount: number;
  /** Their most recent article in the feed, ISO 8601. */
  latestPublishedAt: string;
}
