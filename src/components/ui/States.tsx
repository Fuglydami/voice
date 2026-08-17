import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * The three non-content states, kept together so they share one visual
 * treatment: nothing found, something broke, and a partial upstream failure.
 */

interface StateProps {
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
}

function State({ icon, title, description, children }: StateProps) {
  return (
    <div className="border-rule flex flex-col items-center rounded-card border border-dashed px-6 py-16 text-center">
      <Icon name={icon} size={32} className="text-ink-faint" />
      <h2 className="font-display text-ink mt-element text-title-sm font-bold">{title}</h2>
      <p className="text-ink-muted mt-tight max-w-sm text-body">{description}</p>
      {children ? <div className="mt-stack">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title = "No stories match those filters",
  description = "Try a broader keyword, a wider date range, or clear a filter or two.",
  children,
}: Partial<Omit<StateProps, "icon">>) {
  return (
    <State icon="search" title={title} description={description}>
      {children}
    </State>
  );
}

export function ErrorState({
  title = "Could not load stories",
  description = "The news sources did not respond. This is usually temporary, so try again in a moment.",
  children,
}: Partial<Omit<StateProps, "icon">>) {
  return (
    <State icon="error" title={title} description={description}>
      {children}
    </State>
  );
}

/**
 * Shown when some providers answered and others did not.
 *
 * A partial failure is deliberately *not* an error page: the reader still gets
 * the stories that arrived, with a quiet line naming what is missing. When
 * nothing arrived at all, the reassurance is dropped — telling someone we are
 * "showing everything else" above an empty page is worse than saying nothing.
 */
export function PartialSourceNotice({
  failed,
  hasResults = true,
}: {
  failed: { label: string; error?: string }[];
  hasResults?: boolean;
}) {
  if (failed.length === 0) return null;

  const names = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    failed.map((source) => source.label),
  );

  return (
    <p
      role="status"
      className="border-rule text-ink-muted flex items-start gap-2 rounded-thumb border border-dashed px-3 py-2 text-meta"
    >
      <Icon name="info" size={16} className="text-ink-faint mt-px shrink-0" />
      <span>
        {names} {failed.length === 1 ? "is" : "are"} unavailable right now
        {failed[0]?.error ? ` (${failed[0].error.toLowerCase()})` : ""}.
        {hasResults ? " Showing everything else." : ""}
      </span>
    </p>
  );
}
