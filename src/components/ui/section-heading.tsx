import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

/**
 * The heading that opens a section of a page.
 *
 * Before this existed every section invented its own: the front-page bands had
 * a 2px rule, "Trending authors" had none, page titles were plain text at a
 * different size. One treatment now, with the rule as the constant that marks a
 * section break.
 */
export function SectionHeading({
  title,
  description,
  action,
  level = 2,
  rule = true,
  className,
  id,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  level?: 1 | 2;
  rule?: boolean;
  className?: string;
  id?: string;
}) {
  const Title = level === 1 ? "h1" : "h2";

  return (
    <header className={cn(rule && "border-ink border-t-2 pt-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Title id={id} className="font-display text-ink text-section font-bold tracking-[-0.02em]">
          {title}
        </Title>

        {action ? (
          <Link
            href={action.href}
            className="text-ink-muted hover:text-brand group inline-flex shrink-0 items-center gap-1 text-meta font-medium transition-colors"
          >
            {action.label}
            <Icon
              name="arrow_forward"
              size={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : null}
      </div>

      {description ? (
        <p className="text-ink-muted mt-tight max-w-prose text-body">{description}</p>
      ) : null}
    </header>
  );
}

/** A heading plus its content, with the section rhythm applied. */
export function Section({
  children,
  className,
  ...heading
}: Parameters<typeof SectionHeading>[0] & { children: ReactNode }) {
  return (
    <section aria-labelledby={heading.id} className={cn("mt-section", className)}>
      <SectionHeading {...heading} />
      <div className="mt-stack">{children}</div>
    </section>
  );
}
