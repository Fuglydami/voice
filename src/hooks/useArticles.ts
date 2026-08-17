"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ArticlesResponse } from "@/domain/article";
import { serializeArticleQuery, type ArticleQuery } from "@/domain/query";

/**
 * Client-side access to the aggregation endpoint, built from the same
 * `ArticleQuery` the server validates.
 *
 * `keepPreviousData` keeps the previous results on screen while a filter change
 * loads, instead of collapsing to a skeleton and back on every keystroke.
 */
export function useArticles(query: Partial<ArticleQuery>, enabled = true) {
  const params = serializeArticleQuery(query);
  const search = params.toString();

  return useQuery<ArticlesResponse>({
    queryKey: ["articles", search],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/articles?${search}`, { signal });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as ArticlesResponse;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export interface SourceOption {
  id: ArticlesResponse["sources"][number]["id"];
  label: string;
}

/** The providers that are actually configured, for the source filter. */
export function useSources() {
  return useQuery<{ sources: SourceOption[] }>({
    queryKey: ["sources"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/sources", { signal });
      if (!response.ok) throw new Error("Could not load sources");
      return (await response.json()) as { sources: SourceOption[] };
    },
    // The set of configured providers only changes on a server restart.
    staleTime: Infinity,
  });
}
