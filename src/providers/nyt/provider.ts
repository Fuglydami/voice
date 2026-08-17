import type { Article, Category } from "@/domain/article";
import type { NewsProvider } from "@/domain/provider";
import type { ArticleQuery } from "@/domain/query";
import { serverEnv } from "@/lib/env";
import { buildUrl, fetchJson, UpstreamError } from "@/lib/http";
import { NytResponseSchema } from "./schema";
import { mapNytDoc } from "./mapper";

const ENDPOINT = "https://api.nytimes.com/svc/search/v2/articlesearch.json";

/**
 * New York Times Article Search adapter.
 *
 * Its date parameters use `YYYYMMDD` and its category filter is a Lucene-style
 * `fq` facet query — both translated here so that the rest of the application
 * only ever deals with ISO dates and canonical categories.
 */
export const nytProvider: NewsProvider = {
  id: "nyt",
  label: "The New York Times",

  capabilities: {
    keyword: true,
    dateRange: true,
    category: true,
    author: false,
  },

  isConfigured() {
    return Boolean(serverEnv.nytKey);
  },

  async fetchArticles(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const apiKey = serverEnv.nytKey;
    if (!apiKey) throw new UpstreamError("nyt", 401, "NYT_KEY is not set");

    const url = buildUrl(ENDPOINT, {
      q: query.q || undefined,
      fq: buildFacetQuery(query.categories),
      begin_date: toNytDate(query.from),
      end_date: toNytDate(query.to),
      sort: query.q ? "relevance" : "newest",
      "api-key": apiKey,
    });

    const payload = NytResponseSchema.parse(await fetchJson("nyt", url, signal));

    if (payload.fault?.faultstring) {
      throw new UpstreamError("nyt", 400, payload.fault.faultstring);
    }

    return (payload.response?.docs ?? [])
      .map(mapNytDoc)
      .filter((article): article is Article => article !== null);
  },

  /**
   * No fetch-by-id route, so an article is recovered by searching its slug and
   * matching `web_url`. `fq=web_url:"..."` looks obvious but returns zero
   * documents — the field is not queryable that way. No body either way, so the
   * reader page shows the abstract and links onward.
   */
  async fetchArticle(ref: string, signal: AbortSignal): Promise<Article | null> {
    const apiKey = serverEnv.nytKey;
    if (!apiKey) throw new UpstreamError("nyt", 401, "NYT_KEY is not set");

    // `uri` is the NYT's stable id and IS filterable, unlike `web_url`. Refs
    // captured before that switch are URLs, which fall back to the slug search.
    if (ref.startsWith("nyt://")) {
      const url = buildUrl(ENDPOINT, { fq: `uri:("${ref}")`, "api-key": apiKey });
      const payload = NytResponseSchema.parse(await fetchJson("nyt", url, signal));
      const doc = payload.response?.docs?.[0];
      if (doc) return mapNytDoc(doc);
    }

    const slug = slugWords(ref);
    if (!slug) return null;

    const url = buildUrl(ENDPOINT, { q: slug, "api-key": apiKey });
    const payload = NytResponseSchema.parse(await fetchJson("nyt", url, signal));

    const doc = (payload.response?.docs ?? []).find(
      (candidate) => candidate.uri === ref || candidate.web_url === ref,
    );

    return doc ? mapNytDoc(doc) : null;
  },
};

/** `".../american-airlines-call-signs-phoenix.html"` → `"american airlines call signs phoenix"`. */
function slugWords(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
    return last
      .replace(/\.\w+$/, "")
      .replace(/[-_]+/g, " ")
      .trim()
      .slice(0, 120);
  } catch {
    return "";
  }
}

/** `["sports","health"]` → `news_desk:("Sports" "Health")` */
function buildFacetQuery(categories: Category[]): string | undefined {
  if (categories.length === 0) return undefined;
  const desks = categories.map((category) => `"${NYT_SECTIONS[category]}"`).join(" ");
  return `section_name:(${desks})`;
}

const NYT_SECTIONS: Record<Category, string> = {
  general: "World",
  world: "World",
  politics: "Politics",
  sports: "Sports",
  economy: "Business Day",
  culture: "Arts",
  technology: "Technology",
  science: "Science",
  health: "Health",
};

/** `2026-08-14` → `20260814`. */
function toNytDate(value: string | undefined): string | undefined {
  return value ? value.replaceAll("-", "") : undefined;
}
