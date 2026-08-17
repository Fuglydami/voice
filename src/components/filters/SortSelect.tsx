"use client";

import { useId } from "react";
import { SORT_LABELS, SORT_OPTIONS, type Sort } from "@/domain/query";
import { Icon } from "@/components/ui/Icon";

/**
 * Result ordering.
 *
 * A native `<select>` rather than a custom dropdown: it is three options, it
 * needs no styling beyond the trigger, and the platform control already handles
 * keyboard, screen readers and the mobile picker better than a hand-rolled
 * listbox would.
 *
 * "Most relevant" is disabled without a keyword, because relevance to nothing
 * is not a meaningful order.
 */
export function SortSelect({
  value,
  hasKeyword,
  onChange,
}: {
  value: Sort;
  hasKeyword: boolean;
  onChange: (sort: Sort) => void;
}) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Sort results
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as Sort)}
        className="border-rule bg-surface text-ink hover:border-rule-strong focus:border-ink cursor-pointer appearance-none rounded-full border py-2.5 pr-9 pl-4 text-nav font-medium outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option} disabled={option === "relevance" && !hasKeyword}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        size={18}
        className="text-ink-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      />
    </div>
  );
}
