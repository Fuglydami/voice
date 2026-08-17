import Link from "next/link";
import type { Article } from "@/domain/article";
import { articleHref } from "@/lib/articleRef";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";
import { ArticleBadges } from "./ArticleBadges";
import { CategoryKicker } from "./CategoryKicker";
import { cn } from "@/lib/utils";

/**
 * The grid card used by the front-page section bands and the personalised feed.
 *
 * Deliberately not a boxed card: no border, no shadow, no panel. Grouping comes
 * from a hairline rule above each card and from spacing, which is how a
 * newspaper column is set and what stops forty of these reading as forty
 * competing containers.
 *
 * The image and headline share one link. The kicker renders as plain text
 * inside it rather than a nested anchor, because an anchor inside an anchor is
 * invalid and confuses assistive technology.
 */
export function ArticleCard({
  article,
  showExcerpt = true,
  className,
}: {
  article: Article;
  showExcerpt?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("group border-rule flex flex-col border-t pt-4", className)}>
      <Link href={articleHref(article)} className="flex flex-1 flex-col">
        <span className="rounded-thumb block overflow-hidden">
          <ArticleImage
            image={article.image}
            fallbackAlt={article.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="aspect-[16/10] w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </span>

        <span className="mt-element flex flex-wrap items-center gap-2">
          <CategoryKicker category={article.category} as="text" />
          <ArticleBadges article={article} showReadingTime={false} />
        </span>

        <h3 className="font-display text-ink mt-tight text-title-sm leading-[1.25] font-bold tracking-[-0.015em] text-pretty">
          <span className="decoration-brand underline-offset-4 group-hover:underline">
            {article.title}
          </span>
        </h3>

        {showExcerpt && article.excerpt ? (
          <span className="text-ink-muted line-clamp-2-safe mt-tight block text-body">
            {article.excerpt}
          </span>
        ) : null}
      </Link>

      <ArticleMeta
        article={article}
        className="mt-auto pt-3.5"
        showCategory={false}
        showReadingTime
      />
    </article>
  );
}

export function ArticleGrid({
  articles,
  columns = 3,
}: {
  articles: Article[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-10 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
