"use client";

import { CATEGORY_LABELS, SOURCE_LABELS } from "@/domain/article";
import type { ArticleQuery } from "@/domain/query";
import { countActiveFilters } from "@/domain/query";
import { RemovableChip } from "@/components/ui/chip";

/**
 * A running summary of every filter currently applied, each individually
 * removable.
 *
 * This is the piece the previous design was missing. Selection state lived only
 * inside the filter controls, so once the panel was scrolled past or collapsed
 * on mobile, the reader had no way to see why they were looking at eleven
 * results, and no way to undo one choice without hunting for the control that
 * set it.
 */

interface Removable {
  key: string;
  label: string;
  remove: Partial<ArticleQuery>;
}

export function ActiveFilters({
  query,
  onChange,
  onReset,
}: {
  query: ArticleQuery;
  onChange: (patch: Partial<ArticleQuery>) => void;
  onReset: () => void;
}) {
  const count = countActiveFilters(query);
  if (count === 0) return null;

  const chips: Removable[] = [];

  if (query.q) {
    chips.push({ key: "q", label: `“${query.q}”`, remove: { q: "" } });
  }

  for (const category of query.categories) {
    chips.push({
      key: `category:${category}`,
      label: CATEGORY_LABELS[category],
      remove: { categories: without(query.categories, category) },
    });
  }

  for (const source of query.sources) {
    chips.push({
      key: `source:${source}`,
      label: SOURCE_LABELS[source],
      remove: { sources: without(query.sources, source) },
    });
  }

  for (const author of query.authors) {
    chips.push({
      key: `author:${author}`,
      label: titleCase(author),
      remove: { authors: without(query.authors, author) },
    });
  }

  if (query.from || query.to) {
    chips.push({
      key: "date",
      label: describeRange(query.from, query.to),
      remove: { from: undefined, to: undefined },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-ink-faint text-meta">Filtering by</span>

      {chips.map((chip) => (
        <RemovableChip
          key={chip.key}
          label={chip.label}
          onRemove={() => onChange(chip.remove)}
        />
      ))}

      {chips.length > 1 ? (
        <button
          type="button"
          onClick={onReset}
          className="text-ink-muted hover:text-ink text-meta underline underline-offset-2"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

function without<T>(list: T[], value: T): T[] {
  return list.filter((item) => item !== value);
}

/** `"mary-frost"` reads better as `"Mary Frost"` in a chip. */
function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeRange(from?: string, to?: string): string {
  if (from && to) return `${short(from)} to ${short(to)}`;
  if (from) return `Since ${short(from)}`;
  return `Until ${short(to!)}`;
}

function short(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}
