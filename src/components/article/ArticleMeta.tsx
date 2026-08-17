import Link from "next/link";
import type { Article } from "@/domain/article";
import { CATEGORY_LABELS } from "@/domain/article";
import { formatByline } from "@/lib/dates";
import { readingTime } from "@/lib/readingTime";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";

/**
 * The byline row: avatar · author · category · timestamp.
 *
 * Written once and reused by the hero, the sidebar rows and the search result
 * cards. It is the clearest DRY win in the UI — the row appears five times in
 * the mockup and every instance is this component.
 */

interface ArticleMetaProps {
  article: Article;
  /** `md` is the hero's slightly larger treatment. */
  size?: "sm" | "md";
  /** Off where a `<CategoryKicker>` already states the section above the headline. */
  showCategory?: boolean;
  /** On where the originating publication is worth naming, e.g. search results. */
  showPublication?: boolean;
  /** Appends a reading-time estimate when the source reported a word count. */
  showReadingTime?: boolean;
  className?: string;
}

export function ArticleMeta({
  article,
  size = "sm",
  showCategory = true,
  showPublication = false,
  showReadingTime = false,
  className,
}: ArticleMetaProps) {
  const avatarSize = size === "md" ? 22 : 18;
  const minutes = showReadingTime ? readingTime(article.wordCount) : null;

  return (
    <div className={cn("flex items-center gap-2 text-meta", className)}>
      <Avatar author={article.author} size={avatarSize} />

      <Link
        href={`/search?authors=${encodeURIComponent(article.author.id)}`}
        className="text-ink hover:text-ink-muted truncate font-medium transition-colors"
      >
        {article.author.name}
      </Link>

      {showCategory ? (
        <>
          <span aria-hidden className="bg-rule h-3 w-px shrink-0" />
          <Link
            href={`/?category=${article.category}`}
            className="text-ink-muted hover:text-ink shrink-0 transition-colors"
          >
            {CATEGORY_LABELS[article.category]}
          </Link>
        </>
      ) : null}

      {showPublication ? (
        <>
          <span aria-hidden className="bg-rule h-3 w-px shrink-0" />
          <span className="text-ink-muted shrink-0 truncate">{article.publication}</span>
        </>
      ) : null}

      <span className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
        {minutes ? <span className="text-ink-faint hidden sm:inline">{minutes}</span> : null}
        {minutes ? <span aria-hidden className="bg-rule hidden h-3 w-px sm:block" /> : null}

        <time dateTime={article.publishedAt} className="text-ink-faint">
          {formatByline(article.publishedAt)}
        </time>
      </span>
    </div>
  );
}
