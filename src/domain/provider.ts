import type { Article, SourceId } from "./article";
import type { ArticleQuery } from "./query";

/**
 * Which parts of an `ArticleQuery` this provider can push down to its own API.
 * Anything declared `false` is applied in-memory by the aggregator afterwards,
 * so callers get identical filtering from every provider regardless of what its
 * upstream supports.
 */
export interface ProviderCapabilities {
  keyword: boolean;
  dateRange: boolean;
  category: boolean;
  author: boolean;
}

/** The contract every news source implements. */
export interface NewsProvider {
  readonly id: SourceId;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;

  /** False when the API key is absent — the provider is then skipped, not failed. */
  isConfigured(): boolean;

  /** Resolves with articles or rejects; the aggregator handles rejection. */
  fetchArticles(query: ArticleQuery, signal: AbortSignal): Promise<Article[]>;

  /**
   * Optional: only the Guardian has a fetch-by-id endpoint. NewsAPI and the NYT
   * have no by-id route, so they cannot implement this.
   */
  fetchArticle?(ref: string, signal: AbortSignal): Promise<Article | null>;
}
