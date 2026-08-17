import type {
  Article,
  ArticleFacets,
  ArticlesResponse,
  Facet,
  SourceStatus,
} from "@/domain/article";
import { CATEGORY_LABELS } from "@/domain/article";
import type { NewsProvider } from "@/domain/provider";
import type { ArticleQuery, Sort } from "@/domain/query";
import { withinRange } from "@/lib/dates";
import { normalizeTitle } from "@/lib/text";
import { isPersonByline } from "@/lib/trending";
import { PROVIDER_TIMEOUT_MS } from "@/lib/env";

/**
 * Fans a query out across providers and folds the results into one feed.
 * Providers are injected, so this module knows nothing of NewsAPI, the Guardian
 * or the NYT and is testable against fakes with no network.
 */
export async function aggregate(
  providers: readonly NewsProvider[],
  query: ArticleQuery,
  timeoutMs: number = PROVIDER_TIMEOUT_MS,
): Promise<ArticlesResponse> {
  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const articles = await provider.fetchArticles(query, AbortSignal.timeout(timeoutMs));
      return applyResidualFilters(articles, query, provider);
    }),
  );

  const sources: SourceStatus[] = [];
  const collected: Article[] = [];

  providers.forEach((provider, index) => {
    const result = settled[index];
    const base = { id: provider.id, label: provider.label, configured: provider.isConfigured() };

    if (result?.status === "fulfilled") {
      collected.push(...result.value);
      sources.push({ ...base, ok: true, count: result.value.length });
    } else {
      sources.push({ ...base, ok: false, count: 0, error: describeError(result?.reason) });
    }
  });

  const deduped = dedupe(collected);

  // Built BEFORE the source and author filters: a facet list built after them
  // collapses to the value just picked, leaving no way to switch or widen. This
  // is also why every configured provider is queried even when the reader has
  // narrowed to one — the counts on the unselected values are the point.
  const facets = buildFacets(deduped, sources);

  const filtered = deduped.filter((article) => {
    if (query.sources.length > 0 && !query.sources.includes(article.sourceId)) return false;
    if (query.authors.length > 0 && !query.authors.includes(article.author.id)) return false;
    return true;
  });

  const ordered = sortArticles(filtered, query.sort, query.q);
  const start = (query.page - 1) * query.pageSize;

  return {
    articles: ordered.slice(start, start + query.pageSize),
    sources,
    facets,
    total: ordered.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * Applies the parts of the query the provider could not push to its own API,
 * so a source that cannot filter by category upstream still returns a correctly
 * category-filtered result.
 */
export function applyResidualFilters(
  articles: Article[],
  query: ArticleQuery,
  provider: NewsProvider,
): Article[] {
  const { capabilities } = provider;
  const keyword = query.q.toLowerCase();

  return articles.filter((article) => {
    if (!capabilities.keyword && keyword && !matchesKeyword(article, keyword)) return false;

    if (!capabilities.dateRange && !withinRange(article.publishedAt, query.from, query.to)) {
      return false;
    }

    if (
      !capabilities.category &&
      query.categories.length > 0 &&
      !query.categories.includes(article.category)
    ) {
      return false;
    }

    // Source and author filters run in `aggregate`, after faceting.
    return true;
  });
}

function matchesKeyword(article: Article, keyword: string): boolean {
  return (
    article.title.toLowerCase().includes(keyword) ||
    article.excerpt.toLowerCase().includes(keyword) ||
    article.author.name.toLowerCase().includes(keyword) ||
    article.publication.toLowerCase().includes(keyword)
  );
}

/** Counts each filterable value across the result set. */
export function buildFacets(articles: Article[], sources: SourceStatus[] = []): ArticleFacets {
  const categories = new Map<string, number>();
  const authors = new Map<string, { label: string; count: number }>();
  const sourceCounts = new Map<string, number>();

  for (const article of articles) {
    categories.set(article.category, (categories.get(article.category) ?? 0) + 1);
    sourceCounts.set(article.sourceId, (sourceCounts.get(article.sourceId) ?? 0) + 1);

    // NewsAPI routinely puts the outlet in the author field, which is how
    // "Fox News" ended up offered as a journalist to follow.
    if (isPersonByline(article.author.name, article.publication)) {
      const author = authors.get(article.author.id);
      if (author) author.count += 1;
      else authors.set(article.author.id, { label: article.author.name, count: 1 });
    }
  }

  const byCount = (a: Facet, b: Facet) => b.count - a.count || a.label.localeCompare(b.label);

  return {
    // Registry order, not by count: three fixed sources that reshuffle on every
    // search are harder to use. Counted from the deduped articles — summing each
    // provider's raw total double-counts syndicated stories.
    sources: sources.map((source) => ({
      value: source.id,
      label: source.ok ? source.label : `${source.label} (unavailable)`,
      count: sourceCounts.get(source.id) ?? 0,
    })),
    categories: [...categories.entries()]
      .map(([value, count]) => ({
        value,
        label: CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] ?? value,
        count,
      }))
      .sort(byCount),
    authors: [...authors.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort(byCount),
  };
}

/** "Relevance" needs a keyword to be relevant to, so it falls back to recency. */
export function sortArticles(articles: Article[], sort: Sort, keyword: string): Article[] {
  const byNewest = (a: Article, b: Article) =>
    Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

  if (sort === "oldest") return [...articles].sort((a, b) => -byNewest(a, b));

  if (sort === "relevance" && keyword) {
    const term = keyword.toLowerCase();
    return [...articles].sort(
      (a, b) => relevanceScore(b, term) - relevanceScore(a, term) || byNewest(a, b),
    );
  }

  return [...articles].sort(byNewest);
}

/** A title hit is worth more than an excerpt hit; an exact phrase more than a word. */
function relevanceScore(article: Article, term: string): number {
  const title = article.title.toLowerCase();
  const excerpt = article.excerpt.toLowerCase();

  let score = 0;
  if (title.includes(term)) score += 10;
  if (title.startsWith(term)) score += 5;
  if (excerpt.includes(term)) score += 3;
  if (article.author.name.toLowerCase().includes(term)) score += 2;
  if (article.publication.toLowerCase().includes(term)) score += 1;
  return score;
}

/**
 * Removes the same story arriving from two providers. Canonical URL alone is
 * not enough — syndicated copy appears under different URLs — so a normalised
 * headline is a second key.
 */
export function dedupe(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const output: Article[] = [];

  for (const article of articles) {
    const urlKey = `u:${canonicalUrl(article.url)}`;
    const titleKey = `t:${normalizeTitle(article.title)}`;

    if (seen.has(urlKey) || seen.has(titleKey)) continue;

    seen.add(urlKey);
    seen.add(titleKey);
    output.push(article);
  }

  return output;
}

/** Strips tracking params, trailing slashes and the scheme before comparing. */
function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return `${parsed.host}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function describeError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return "Unknown error";
}
