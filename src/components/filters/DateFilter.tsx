"use client";

import { useId } from "react";
import type { ArticleQuery } from "@/domain/query";
import { daysAgo, today } from "@/lib/dates";
import { Button } from "@/components/ui/button";

/**
 * Date-range filter: presets first, exact range second.
 *
 * Nearly every real use is "recent", so the presets carry the common case and
 * the two date inputs handle the rest. The presets are toggles, not just
 * shortcuts, so the reader can see which one is currently in effect.
 */

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
] as const;

export function DateFilter({
  query,
  onChange,
}: {
  query: ArticleQuery;
  onChange: (patch: Partial<ArticleQuery>) => void;
}) {
  const fromId = useId();
  const toId = useId();
  const now = today();

  const activePreset = PRESETS.find(
    (preset) => query.to === now && query.from === daysAgo(preset.days),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <Button
              key={preset.label}
              size="xs"
              variant={isActive ? "default" : "outline"}
              aria-pressed={isActive}
              onClick={() =>
                isActive
                  ? onChange({ from: undefined, to: undefined })
                  : onChange({ from: daysAgo(preset.days), to: now })
              }
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-element grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={fromId} className="text-ink-faint mb-1 block text-meta">
            From
          </label>
          <input
            id={fromId}
            type="date"
            value={query.from ?? ""}
            max={query.to ?? now}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
            className="border-rule bg-surface text-ink focus:border-ink w-full rounded-thumb border px-2.5 py-1.5 text-meta outline-none"
          />
        </div>
        <div>
          <label htmlFor={toId} className="text-ink-faint mb-1 block text-meta">
            To
          </label>
          <input
            id={toId}
            type="date"
            value={query.to ?? ""}
            min={query.from}
            max={now}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
            className="border-rule bg-surface text-ink focus:border-ink w-full rounded-thumb border px-2.5 py-1.5 text-meta outline-none"
          />
        </div>
      </div>
    </div>
  );
}
