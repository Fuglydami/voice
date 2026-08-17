import type { Article } from "@/domain/article";
import type { NewsProvider } from "@/domain/provider";
import type { ArticleQuery } from "@/domain/query";
import { CATEGORY_QUERY_TERMS } from "@/lib/categories";
import { serverEnv } from "@/lib/env";
import { buildUrl, fetchJson, UpstreamError } from "@/lib/http";
import { NewsApiResponseSchema } from "./schema";
import { mapNewsApiArticle } from "./mapper";
import { fetchPublisherCatalogue } from "./sources";

const ENDPOINT = "https://newsapi.org/v2/everything";
const TOP_HEADLINES = "https://newsapi.org/v2/top-headlines";

/**
 * NewsAPI.org adapter.
 *
 * The free "Developer" plan restricts browser requests to a `localhost` origin.
 * That is a CORS rule and does not apply to this call, which is made from the
 * server with no `Origin` header — verified against a public deployment. The
 * plan is still development-use, so treat the free key accordingly.
 */
export const newsApiProvider: NewsProvider = {
  id: "newsapi",
  label: "NewsAPI",

  capabilities: {
    keyword: true,
    dateRange: true,
    // `/everything` has no category parameter — we approximate it with search
    // terms and let the aggregator apply the exact filter afterwards.
    category: false,
    author: false,
  },

  isConfigured() {
    return Boolean(serverEnv.newsapiKey);
  },

  async fetchArticles(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const apiKey = serverEnv.newsapiKey;
    if (!apiKey) throw new UpstreamError("newsapi", 401, "NEWSAPI_KEY is not set");

    const search = buildSearchTerm(query);

    // With no keyword and no category there is nothing meaningful to search
    // for, so fall back to the headlines endpoint rather than sending a
    // wildcard `/everything` query (which NewsAPI rejects).
    const url = search
      ? buildUrl(ENDPOINT, {
          q: search,
          from: query.from,
          to: query.to,
          language: "en",
          sortBy: "publishedAt",
          pageSize: 40,
          apiKey,
        })
      : buildUrl(TOP_HEADLINES, { language: "en", pageSize: 40, apiKey });

    // The catalogue request runs alongside the search rather than before it,
    // so classification costs no extra latency.
    const [payload, catalogue] = await Promise.all([
      fetchJson("newsapi", url, signal).then((body) => NewsApiResponseSchema.parse(body)),
      fetchPublisherCatalogue(signal),
    ]);

    if (payload.status !== "ok") {
      throw new UpstreamError("newsapi", 400, payload.message ?? "NewsAPI returned an error");
    }

    return (payload.articles ?? [])
      .map((raw) => mapNewsApiArticle(raw, catalogue))
      .filter((article): article is Article => article !== null);
  },

  /**
   * NewsAPI has neither a fetch-by-id route nor a URL filter, so a single
   * article is recovered by searching the index and matching the URL exactly.
   * Even when found, the free tier's `content` is truncated at ~200 characters,
   * so the reader page can only ever show an extract for this source.
   */
  async fetchArticle(ref: string, signal: AbortSignal): Promise<Article | null> {
    const apiKey = serverEnv.newsapiKey;
    if (!apiKey) throw new UpstreamError("newsapi", 401, "NEWSAPI_KEY is not set");

    // Search on the article's own slug: it is the most distinctive text
    // available, since the endpoint cannot be queried by URL.
    const slug = lastPathSegment(ref).replace(/[-_]+/g, " ").slice(0, 120);
    if (!slug) return null;

    const url = buildUrl(ENDPOINT, {
      qInTitle: slug,
      language: "en",
      pageSize: 20,
      apiKey,
    });

    const payload = NewsApiResponseSchema.parse(await fetchJson("newsapi", url, signal));
    if (payload.status !== "ok") return null;

    const match = (payload.articles ?? []).find((candidate) => candidate.url?.trim() === ref);
    return match ? mapNewsApiArticle(match) : null;
  },
};

function lastPathSegment(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1)?.replace(/\.\w+$/, "") ?? "";
  } catch {
    return "";
  }
}

/** Keyword, else the selected categories as OR-ed search terms, else nothing. */
function buildSearchTerm(query: ArticleQuery): string {
  if (query.q) return query.q;
  if (query.categories.length > 0) {
    return query.categories.map((category) => CATEGORY_QUERY_TERMS[category]).join(" OR ");
  }
  return "";
}
