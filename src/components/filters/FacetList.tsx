"use client";

import { useId, useMemo, useState } from "react";
import type { Facet } from "@/domain/article";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * A checkable list of filter values with match counts. The counts are the point:
 * "The Guardian 40" tells the reader which click is worth making, and a value
 * with no matches can be seen for what it is before it empties the page.
 */

interface FacetListProps {
  facets: Facet[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Adds a filter-within box, for lists that run long. */
  searchable?: boolean;
  searchLabel?: string;
  /** Rows shown before "show more". */
  collapseAfter?: number;
  emptyHint?: string;
  /** Display labels for selected values absent from `facets`. */
  labelFor?: (value: string) => string;
  isLoading?: boolean;
}

export function FacetList({
  facets,
  selected,
  onToggle,
  searchable = false,
  searchLabel = "value",
  collapseAfter = 8,
  emptyHint = "Nothing to filter by yet.",
  labelFor,
  isLoading = false,
}: FacetListProps) {
  const searchId = useId();
  const [needle, setNeedle] = useState("");
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => {
    const term = needle.trim().toLowerCase();
    const matched = term
      ? facets.filter((facet) => facet.label.toLowerCase().includes(term))
      : facets;

    // A selected value stays visible even when it is not in the current result
    // set. Hiding the filter that produced the current view is disorienting and
    // makes it impossible to switch off.
    const withSelected = [
      ...matched,
      ...selected
        .filter((value) => !matched.some((facet) => facet.value === value))
        .map((value) => ({ value, label: labelFor?.(value) ?? value, count: 0 })),
    ];

    return expanded || term ? withSelected : withSelected.slice(0, collapseAfter);
  }, [facets, needle, selected, expanded, collapseAfter, labelFor]);

  const hidden = facets.length - visible.length;

  // The hint waits for data. Showing it during the first fetch made an ordinary
  // load announce "No sources configured" at a correctly configured reader.
  if (visible.length === 0) {
    return isLoading ? (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    ) : (
      <p className="text-ink-faint text-meta">{emptyHint}</p>
    );
  }

  return (
    <div>
      {searchable && facets.length > collapseAfter ? (
        <div className="relative mb-2">
          <label htmlFor={searchId} className="sr-only">
            Filter {searchLabel}s
          </label>
          <Icon
            name="search"
            size={14}
            className="text-ink-faint pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            id={searchId}
            type="text"
            value={needle}
            onChange={(event) => setNeedle(event.target.value)}
            placeholder={`Find a ${searchLabel}`}
            className="border-rule bg-surface text-ink placeholder:text-ink-faint focus:border-ink w-full rounded-md border py-1.5 pr-2 pl-8 text-meta outline-none"
          />
        </div>
      ) : null}

      <ul className="space-y-px">
        {visible.map((facet) => {
          const isSelected = selected.includes(facet.value);
          return (
            <li key={facet.value}>
              <label
                className={cn(
                  "hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                  isSelected && "bg-muted",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(facet.value)}
                  className="shrink-0"
                />
                <span className="text-ink min-w-0 flex-1 truncate text-nav">{facet.label}</span>
                <span className="text-ink-faint shrink-0 text-meta tabular-nums">
                  {facet.count}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {!needle && hidden > 0 ? (
        <Button variant="ghost" size="xs" className="mt-1" onClick={() => setExpanded(true)}>
          Show {hidden} more
        </Button>
      ) : null}

      {!needle && expanded && facets.length > collapseAfter ? (
        <Button variant="ghost" size="xs" className="mt-1" onClick={() => setExpanded(false)}>
          Show fewer
        </Button>
      ) : null}
    </div>
  );
}
