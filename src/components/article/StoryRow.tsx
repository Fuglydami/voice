import Link from "next/link";
import type { Article } from "@/domain/article";
import { articleHref } from "@/lib/articleRef";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";
import { CategoryKicker } from "./CategoryKicker";
import { ArticleBadges } from "./ArticleBadges";

/**
 * One sidebar story: a thumbnail beside a two-or-three-line headline, with the
 * byline row underneath spanning the full width — matching the mockup, where
 * the meta line runs past the left edge of the headline column.
 */
export function StoryRow({ article }: { article: Article }) {
  return (
    <article className="group py-5">
      <div className="grid grid-cols-[100px_1fr] gap-4 sm:grid-cols-[112px_1fr]">
        <Link
          href={articleHref(article)}
          className="overflow-hidden rounded-thumb"
        >
          <ArticleImage
            image={article.image}
            fallbackAlt={article.title}
            sizes="112px"
            className="aspect-[4/3] w-full transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryKicker category={article.category} />
            <ArticleBadges article={article} showReadingTime={false} />
          </div>
          <h3 className="font-display text-ink mt-tight text-title-sm leading-[1.25] font-bold tracking-[-0.015em] text-pretty sm:text-title-lg">
            <Link
              href={articleHref(article)}
              className="decoration-brand underline-offset-4 hover:underline"
            >
              {article.title}
            </Link>
          </h3>
        </div>
      </div>

      <ArticleMeta article={article} className="mt-element" showCategory={false} />
    </article>
  );
}

/**
 * The sidebar list. Hairline rules sit *between* rows only — a trailing border
 * under the last item would read as the start of the next section.
 */
export function StoryList({ articles }: { articles: Article[] }) {
  return (
    <div className="divide-rule divide-y">
      {articles.map((article) => (
        <StoryRow key={article.id} article={article} />
      ))}
    </div>
  );
}
