import type { Article } from "@/domain/article";
import { ARTICLE_KIND_LABELS } from "@/domain/article";
import { Badge } from "@/components/ui/badge";
import { readingTime } from "@/lib/readingTime";
import { formatElapsed } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * The status strip above a headline: live state, what kind of piece it is, and
 * how long it takes to read.
 *
 * Rebuilt on shadcn's `Badge`. The hand-rolled version set its own border,
 * radius, padding and font on each instance, which is how the "REVIEW" pill
 * ended up a different height from the "LIVE" pill and both a different height
 * from the reading time. One primitive, two variants, consistent metrics.
 *
 * Only exceptional states earn a badge. "News" is the default and says nothing,
 * so it is never shown: a page where everything is badged is a page where the
 * badges have stopped meaning anything.
 */

export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("bg-brand gap-1.5 border-transparent text-white", className)}>
      {/* The only looping animation in the app, and it is motivated: "live"
          means the story is still changing, which a static badge cannot convey.
          It stops under prefers-reduced-motion, handled globally. */}
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-white" />
      </span>
      Live
    </Badge>
  );
}

export function ArticleBadges({
  article,
  showReadingTime = true,
  className,
}: {
  article: Article;
  showReadingTime?: boolean;
  className?: string;
}) {
  const minutes = showReadingTime ? readingTime(article.wordCount) : null;

  const kind =
    article.kind && article.kind !== "news" && article.kind !== "live" ? article.kind : null;

  const updated = article.isLive && article.updatedAt ? formatElapsed(article.updatedAt) : null;

  if (!article.isLive && !kind && !minutes) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {article.isLive ? <LiveBadge /> : null}

      {updated ? (
        <span className="text-brand text-kicker font-semibold">Updated {updated} ago</span>
      ) : null}

      {kind ? <Badge variant="outline">{ARTICLE_KIND_LABELS[kind]}</Badge> : null}

      {minutes ? <span className="text-ink-faint text-kicker font-medium">{minutes}</span> : null}
    </div>
  );
}
