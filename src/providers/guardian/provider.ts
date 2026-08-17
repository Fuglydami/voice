import type { Article, Category } from "@/domain/article";
import type { NewsProvider } from "@/domain/provider";
import type { ArticleQuery } from "@/domain/query";
import { serverEnv } from "@/lib/env";
import { buildUrl, fetchJson, UpstreamError } from "@/lib/http";
import { GuardianItemResponseSchema, GuardianResponseSchema } from "./schema";
import { mapGuardianResult } from "./mapper";

const ENDPOINT = "https://content.guardianapis.com/search";

/**
 * Everything `mapGuardianResult` reads. Shared by both call sites deliberately:
 * the Guardian returns only what you ask for, so a field the mapper reads but
 * the request omits comes back null with no error. The two had already drifted,
 * silently costing the reader page its topics, image credits and live state.
 */
const SHOW_FIELDS =
  "headline,trailText,standfirst,byline,thumbnail,wordcount,lastModified,firstPublicationDate,isLive,liveBloggingNow";
const SHOW_TAGS = "contributor,keyword,tone";
/** Carries the real alt text, caption, credit and dimensions. */
const SHOW_ELEMENTS = "image";

/**
 * Guardian Open Platform adapter — the only provider that can push keyword, date
 * range and category down to its own API, so its `capabilities` are the widest.
 */
export const guardianProvider: NewsProvider = {
  id: "guardian",
  label: "The Guardian",

  capabilities: {
    keyword: true,
    dateRange: true,
    category: true,
    author: false,
  },

  isConfigured() {
    return Boolean(serverEnv.guardianKey);
  },

  async fetchArticles(query: ArticleQuery, signal: AbortSignal): Promise<Article[]> {
    const apiKey = serverEnv.guardianKey;
    if (!apiKey) throw new UpstreamError("guardian", 401, "GUARDIAN_KEY is not set");

    const url = buildUrl(ENDPOINT, {
      q: query.q || undefined,
      section: query.categories.map(toGuardianSection).filter(Boolean).join("|") || undefined,
      "from-date": query.from,
      "to-date": query.to,
      "order-by": query.q ? "relevance" : "newest",
      // `body` is absent here: 40 KB per article across 40 results is a
      // megabyte of HTML nobody reads on a list page.
      "show-fields": SHOW_FIELDS,
      "show-tags": SHOW_TAGS,
      "show-elements": SHOW_ELEMENTS,
      "page-size": 40,
      "api-key": apiKey,
    });

    const payload = GuardianResponseSchema.parse(await fetchJson("guardian", url, signal));

    if (payload.response.status !== "ok") {
      throw new UpstreamError(
        "guardian",
        400,
        payload.response.message ?? "The Guardian returned an error",
      );
    }

    return (payload.response.results ?? [])
      .map(mapGuardianResult)
      .filter((article): article is Article => article !== null);
  },

  /** The only provider with a fetch-by-id endpoint, and a complete body. */
  async fetchArticle(ref: string, signal: AbortSignal): Promise<Article | null> {
    const apiKey = serverEnv.guardianKey;
    if (!apiKey) throw new UpstreamError("guardian", 401, "GUARDIAN_KEY is not set");

    const url = buildUrl(`https://content.guardianapis.com/${ref.replace(/^\/+/, "")}`, {
      // The list set plus `body` — the one field only the reader needs.
      "show-fields": `${SHOW_FIELDS},body`,
      "show-tags": SHOW_TAGS,
      "show-elements": SHOW_ELEMENTS,
      "api-key": apiKey,
    });

    const payload = GuardianItemResponseSchema.parse(await fetchJson("guardian", url, signal));

    if (payload.response.status !== "ok" || !payload.response.content) return null;

    return mapGuardianResult(payload.response.content);
  },
};

/** Our canonical category → the Guardian's own section id. */
function toGuardianSection(category: Category): string {
  const sections: Record<Category, string> = {
    general: "news",
    world: "world",
    politics: "politics",
    sports: "sport",
    economy: "business",
    culture: "culture",
    technology: "technology",
    science: "science",
    health: "society",
  };
  return sections[category];
}
