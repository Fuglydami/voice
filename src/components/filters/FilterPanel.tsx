"use client";

import { useMemo } from "react";
import type { ArticleFacets } from "@/domain/article";
import { CATEGORY_LABELS, SOURCE_LABELS } from "@/domain/article";
import type { ArticleQuery } from "@/domain/query";
import { countActiveFilters } from "@/domain/query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { FacetList } from "./FacetList";
import { DateFilter } from "./DateFilter";
import { cn } from "@/lib/utils";

/**
 * The search filter rail. Source and Category are open by default — they are
 * short and the ones people reach for; Date and Author open on demand.
 */
export function FilterPanel({
  query,
  facets,
  onChange,
  onReset,
  isLoading = false,
}: {
  query: ArticleQuery;
  facets: ArticleFacets;
  onChange: (patch: Partial<ArticleQuery>) => void;
  onReset: () => void;
  isLoading?: boolean;
}) {
  const activeCount = countActiveFilters(query);

  // Authors are long-tailed: most write once. Surfacing the regulars first
  // makes the list usable without a scroll.
  const authorFacets = useMemo(
    () => facets.authors.filter((author, index) => author.count > 1 || index < 10),
    [facets.authors],
  );

  const dateSummary = describeDates(query.from, query.to);

  return (
    <div>
      <div className="mb-element flex items-center justify-between gap-2">
        <h2 className="text-ink flex items-center gap-2 text-nav font-semibold">
          <Icon name="tune" size={16} className="text-ink-muted" />
          Filters
        </h2>

        {activeCount > 0 ? (
          <Button variant="ghost" size="xs" onClick={onReset}>
            Clear all
          </Button>
        ) : null}
      </div>

      <Accordion
        type="multiple"
        defaultValue={["source", "category"]}
        className="border-rule border-t"
      >
        <FilterGroup
          id="source"
          icon="bookmark"
          label="Source"
          summary={query.sources.map((source) => SOURCE_LABELS[source])}
        >
          <FacetList
            facets={facets.sources}
            selected={query.sources}
            isLoading={isLoading}
            emptyHint="No sources configured. See the README."
            onToggle={(value) =>
              onChange({ sources: toggle(query.sources, value as ArticleQuery["sources"][number]) })
            }
          />
        </FilterGroup>

        <FilterGroup
          id="category"
          icon="newspaper"
          label="Category"
          summary={query.categories.map((category) => CATEGORY_LABELS[category])}
        >
          <FacetList
            facets={facets.categories}
            selected={query.categories}
            isLoading={isLoading}
            onToggle={(value) =>
              onChange({
                categories: toggle(query.categories, value as ArticleQuery["categories"][number]),
              })
            }
          />
        </FilterGroup>

        <FilterGroup
          id="date"
          icon="calendar_today"
          label="Published"
          summary={dateSummary ? [dateSummary] : []}
        >
          <DateFilter query={query} onChange={onChange} />
        </FilterGroup>

        <FilterGroup
          id="author"
          icon="person"
          label="Author"
          summary={query.authors.map(titleCaseSlug)}
        >
          <FacetList
            facets={authorFacets}
            selected={query.authors}
            isLoading={isLoading}
            searchable
            searchLabel="author"
            labelFor={titleCaseSlug}
            emptyHint="Authors appear once articles load."
            onToggle={(value) => onChange({ authors: toggle(query.authors, value) })}
          />
        </FilterGroup>
      </Accordion>
    </div>
  );
}

/**
 * One collapsible group. The header names its selections rather than counting
 * them, so a closed group is still readable.
 */
function FilterGroup({
  id,
  icon,
  label,
  summary,
  children,
}: {
  id: string;
  icon: IconName;
  label: string;
  summary: string[];
  children: React.ReactNode;
}) {
  const active = summary.length > 0;

  return (
    <AccordionItem value={id} className="border-rule border-b">
      <AccordionTrigger className="py-3.5 hover:no-underline">
        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <span
            className={cn(
              "flex items-center gap-2 text-nav font-semibold",
              active ? "text-ink" : "text-ink-muted",
            )}
          >
            <Icon
              name={icon}
              size={15}
              className={active ? "text-brand" : "text-ink-faint"}
            />
            {label}
          </span>

          {active ? (
            <span className="text-ink-faint max-w-[13rem] truncate pl-[1.4rem] text-meta">
              {summary.join(", ")}
            </span>
          ) : null}
        </span>
      </AccordionTrigger>

      <AccordionContent className="pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

/** `"2026-08-01"`, `"2026-08-10"` → `"1 Aug – 10 Aug"`. */
function describeDates(from?: string, to?: string): string | null {
  if (!from && !to) return null;
  if (from && to) return `${short(from)} – ${short(to)}`;
  return from ? `Since ${short(from)}` : `Until ${short(to!)}`;
}

function short(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** `"adam-gabbatt"` reads as `"Adam Gabbatt"` when it is not in the facet list. */
function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
