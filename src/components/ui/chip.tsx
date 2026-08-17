"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

/**
 * Pill controls, built on the shadcn primitives so they share metrics with
 * every other control rather than each setting its own padding and radius.
 */

/** A toggleable value, e.g. a category in the feed preferences. */
export function Chip({
  label,
  selected = false,
  count,
  onToggle,
  className,
}: {
  label: string;
  selected?: boolean;
  count?: number;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      variant={selected ? "default" : "outline"}
      size="sm"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn("rounded-full", className)}
    >
      {selected ? <Icon name="check" size={13} /> : null}
      <span className="truncate">{label}</span>
      {count !== undefined ? (
        <span className={cn("tabular-nums", selected ? "opacity-70" : "text-ink-faint")}>
          {count}
        </span>
      ) : null}
    </Button>
  );
}

/**
 * A chip that removes a filter. Same family, but the affordance is a close
 * icon rather than a check, because the action is subtractive.
 */
export function RemovableChip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className={cn("group max-w-[16rem] rounded-full", className)}
    >
      <span className="truncate">{label}</span>
      <Icon
        name="close"
        size={13}
        className="text-ink-faint group-hover:text-ink transition-colors"
      />
    </Button>
  );
}

/** The small filled count inside a control, e.g. "Filters (3)". */
export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <Badge variant="secondary" className="tabular-nums">
      {children}
    </Badge>
  );
}
