import { z } from "zod";
import { CategorySchema, SourceIdSchema } from "./article";

/**
 * The one query object that travels the whole stack: filter UI → URL params →
 * route handler → every provider, so client and server cannot disagree about
 * what a filter means.
 *
 * "Source" means one of the three data sources from the brief's list, not the
 * originating publication — that is carried on every article and shown, but is
 * not a filter.
 */

/**
 * Accepts `a,b,c` or a repeated param, dropping values the item schema rejects
 * rather than failing the request: a stale bookmark should degrade to a broader
 * result set, not a 400.
 */
const csvOf = <T extends string>(item: z.ZodType<T>) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value): T[] => {
      if (value === undefined) return [];
      const raw = Array.isArray(value) ? value : value.split(",");
      return raw
        .map((entry) => entry.trim())
        .filter(Boolean)
        .filter((entry): entry is T => item.safeParse(entry).success);
    });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .optional();

export const SORT_OPTIONS = ["newest", "oldest", "relevance"] as const;
export const SortSchema = z.enum(SORT_OPTIONS).catch("newest").default("newest");
export type Sort = z.infer<typeof SortSchema>;

export const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  relevance: "Most relevant",
};

export const ArticleQuerySchema = z.object({
  /** Free-text keyword search. */
  q: z.string().trim().max(200).optional().default(""),
  /** Inclusive lower bound on publication date, YYYY-MM-DD. */
  from: isoDate,
  /** Inclusive upper bound on publication date, YYYY-MM-DD. */
  to: isoDate,
  /** Empty means "all categories". */
  categories: csvOf(CategorySchema),
  /** Which of the three data sources to query. Empty means all configured ones. */
  sources: csvOf(SourceIdSchema),
  /** Author slugs. No source filters by author natively, so applied in-memory. */
  authors: csvOf(z.string()),
  sort: SortSchema,
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(12).default(12),
});

export type ArticleQuery = z.infer<typeof ArticleQuerySchema>;

/** Parses `URLSearchParams` (or a plain record) into a validated query. */
export function parseArticleQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): ArticleQuery {
  const record =
    input instanceof URLSearchParams
      ? Object.fromEntries(
          [...new Set(input.keys())].map((key) => {
            const all = input.getAll(key);
            return [key, all.length > 1 ? all : all[0]];
          }),
        )
      : input;

  return ArticleQuerySchema.parse(record);
}

/** The inverse: a query back into search params, omitting defaults so URLs stay short. */
export function serializeArticleQuery(query: Partial<ArticleQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.categories?.length) params.set("categories", query.categories.join(","));
  if (query.sources?.length) params.set("sources", query.sources.join(","));
  if (query.authors?.length) params.set("authors", query.authors.join(","));
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize && query.pageSize !== 12) params.set("pageSize", String(query.pageSize));
  return params;
}

/** True when the query would return an unfiltered feed. */
export function isEmptyQuery(query: ArticleQuery): boolean {
  return countActiveFilters(query) === 0;
}

/** How many filters the reader has applied. Drives the "Clear all" affordance. */
export function countActiveFilters(query: ArticleQuery): number {
  return (
    (query.q ? 1 : 0) +
    (query.from || query.to ? 1 : 0) +
    query.categories.length +
    query.sources.length +
    query.authors.length
  );
}
