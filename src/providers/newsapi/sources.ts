import { z } from "zod";
import type { Category } from "@/domain/article";
import { serverEnv, PROVIDER_CACHE_SECONDS } from "@/lib/env";
import { buildUrl, fetchJson } from "@/lib/http";

/**
 * NewsAPI's publisher catalogue. `/everything` returns no section, so a quarter
 * of NewsAPI articles were classified from the headline alone. This endpoint
 * gives every publisher a real `category`, so an ESPN article is filed as sport
 * because ESPN is a sports publisher, not because "sport" appeared in the title.
 */

const ENDPOINT = "https://newsapi.org/v2/top-headlines/sources";

const SourcesResponseSchema = z.object({
  status: z.string(),
  sources: z
    .array(
      z.object({
        id: z.string().nullish(),
        name: z.string().nullish(),
        category: z.string().nullish(),
        country: z.string().nullish(),
        language: z.string().nullish(),
      }),
    )
    .nullish(),
});

/** NewsAPI's own category vocabulary → ours. */
const CATEGORY_MAP: Record<string, Category> = {
  general: "general",
  business: "economy",
  entertainment: "culture",
  health: "health",
  science: "science",
  sports: "sports",
  technology: "technology",
};

export interface PublisherProfile {
  category: Category | null;
  country: string | null;
}

/**
 * Publisher name (lower-cased) → profile. Names rather than ids, because
 * `/everything` articles frequently carry `source.id: null` and only a name.
 */
export type PublisherCatalogue = Map<string, PublisherProfile>;

const EMPTY: PublisherCatalogue = new Map();

export async function fetchPublisherCatalogue(signal: AbortSignal): Promise<PublisherCatalogue> {
  const apiKey = serverEnv.newsapiKey;
  if (!apiKey) return EMPTY;

  try {
    const url = buildUrl(ENDPOINT, { language: "en", apiKey });
    const payload = SourcesResponseSchema.parse(
      await fetchJson("newsapi", url, signal, PROVIDER_CACHE_SECONDS * 12),
    );

    if (payload.status !== "ok") return EMPTY;

    const catalogue: PublisherCatalogue = new Map();

    for (const source of payload.sources ?? []) {
      const name = source.name?.trim().toLowerCase();
      if (!name) continue;

      catalogue.set(name, {
        category: CATEGORY_MAP[source.category?.trim().toLowerCase() ?? ""] ?? null,
        country: source.country?.trim() || null,
      });
    }

    return catalogue;
  } catch {
    // The catalogue is an enhancement, never a dependency: if it cannot be
    // fetched, classification falls back to the headline as before.
    return EMPTY;
  }
}
