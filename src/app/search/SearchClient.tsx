"use client";

import { useState } from "react";
import type { ArticleFacets } from "@/domain/article";
import { useQuerySync } from "@/hooks/useQuerySync";
import { useArticles } from "@/hooks/useArticles";
import { countActiveFilters } from "@/domain/query";
import { SearchField } from "@/components/filters/SearchField";
import { SortSelect } from "@/components/filters/SortSelect";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { ArticleList } from "@/components/article/ArticleListRow";
import { ListSkeleton } from "@/components/ui/skeletons";
import { EmptyState, ErrorState, PartialSourceNotice } from "@/components/ui/States";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const EMPTY_FACETS: ArticleFacets = { sources: [], categories: [], authors: [] };

/**
 * Search and filtering (requirement R1), built around a faceted rail: every
 * facet on screen with match counts, and a removable summary above the results.
 *
 * All filter state lives in the URL, so a shared link reproduces the result set
 * and the back button steps through filter combinations.
 */
export function SearchClient() {
  const { query, setQuery, reset } = useQuerySync();
  const { data, isPending, isFetching, isError, refetch } = useArticles(query);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const articles = data?.articles ?? [];
  const facets = data?.facets ?? EMPTY_FACETS;
  const sources = data?.sources ?? [];
  const failed = sources.filter((source) => !source.ok);
  const activeCount = countActiveFilters(query);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const panel = (
    <FilterPanel
      query={query}
      facets={facets}
      onChange={setQuery}
      onReset={reset}
      isLoading={isPending}
    />
  );

  return (
    <div>
      <header className="mb-stack">
        <h1 className="font-display text-ink text-section font-bold tracking-[-0.01em]">
          Search
        </h1>
        <p className="text-ink-muted mt-tight text-body">
          One query across all three sources, filtered by source, category, date and author.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField value={query.q} onChange={(q) => setQuery({ q })} autoFocus />

        <div className="flex items-center gap-2">
          <SortSelect
            value={query.sort}
            hasKeyword={Boolean(query.q)}
            onChange={(sort) => setQuery({ sort })}
          />

          {/* Desktop keeps the rail on screen; below lg the same panel opens in a sheet. */}
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden"
          >
            <Icon name="tune" size={18} />
            Filters
            {activeCount > 0 ? (
              <CountBadge>{activeCount}</CountBadge>
            ) : null}
          </Button>
        </div>
      </div>

      {activeCount > 0 ? (
        <div className="mt-element">
          <ActiveFilters query={query} onChange={setQuery} onReset={reset} />
        </div>
      ) : null}

      {failed.length > 0 ? (
        <div className="mt-element">
          <PartialSourceNotice failed={failed} hasResults={articles.length > 0} />
        </div>
      ) : null}

      <div className="mt-stack grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-6">{panel}</div>
        </aside>

        <section aria-label="Results">
          <p role="status" aria-live="polite" className="text-ink-muted mb-stack text-meta">
            {isPending
              ? "Searching…"
              : data
                ? `${data.total.toLocaleString()} ${data.total === 1 ? "story" : "stories"}`
                : ""}
          </p>

          {isError ? (
            <ErrorState>
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
            </ErrorState>
          ) : isPending ? (
            <ListSkeleton />
          ) : articles.length === 0 ? (
            <EmptyState>
              {activeCount > 0 ? (
                <Button variant="outline" onClick={reset}>
                  Clear all filters
                </Button>
              ) : null}
            </EmptyState>
          ) : (
            <>
              {/* Dimmed rather than replaced while refetching, so the page does
                  not collapse to a skeleton on every filter change. */}
              <div className={cn("transition-opacity", isFetching && "opacity-55")}>
                <ArticleList articles={articles} />
              </div>

              {totalPages > 1 ? (
                <Pagination
                  page={query.page}
                  totalPages={totalPages}
                  onChange={(page) => {
                    setQuery({ page });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ) : null}
            </>
          )}
        </section>
      </div>

      {/* Below lg the same panel opens in a sheet, so a phone gets every filter
          the desktop rail has rather than a reduced set. */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[min(22rem,90vw)] gap-0 p-0">
          <SheetHeader className="px-5 py-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <Separator />
          <div className="overflow-y-auto px-5 py-4">{panel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="border-rule mt-section flex items-center justify-between border-t pt-6"
    >
      <PageButton
        direction="back"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        label="Previous"
      />
      <p className="text-ink-muted text-meta tabular-nums" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <PageButton
        direction="forward"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        label="Next"
      />
    </nav>
  );
}

function PageButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "back" | "forward";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      {direction === "back" ? <Icon name="arrow_back" size={16} /> : null}
      {label}
      {direction === "forward" ? <Icon name="arrow_forward" size={16} /> : null}
    </Button>
  );
}
