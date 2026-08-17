"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseArticleQuery, serializeArticleQuery, type ArticleQuery } from "@/domain/query";

/**
 * Keeps filter state in the URL, so a copied link reproduces the result set and
 * the back button steps through filter combinations — and so there is one source
 * of truth rather than a `useState` mirror of the address bar.
 */
export function useQuerySync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(
    () => parseArticleQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setQuery = useCallback(
    (patch: Partial<ArticleQuery>) => {
      // Any filter change returns to page 1.
      const next = { ...query, ...patch, page: patch.page ?? 1 };
      const search = serializeArticleQuery(next).toString();

      // `scroll: false` keeps the reader's position while they adjust filters.
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return { query, setQuery, reset };
}
