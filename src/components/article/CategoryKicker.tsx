import Link from "next/link";
import { CATEGORY_LABELS, type Category } from "@/domain/article";
import { cn } from "@/lib/utils";

/**
 * The small category label above a headline — the one place the accent colour
 * does real work, letting a reader triage a dense page without reading it. Also
 * a link, so it doubles as a one-click filter into that section.
 */
export function CategoryKicker({
  category,
  className,
  as = "link",
}: {
  category: Category;
  className?: string;
  /** `text` when the kicker sits inside another link and cannot nest one. */
  as?: "link" | "text";
}) {
  const classes = cn("kicker text-brand inline-block", className);

  if (as === "text") {
    return <span className={classes}>{CATEGORY_LABELS[category]}</span>;
  }

  return (
    <Link href={`/?category=${category}`} className={cn(classes, "hover:underline")}>
      {CATEGORY_LABELS[category]}
    </Link>
  );
}
