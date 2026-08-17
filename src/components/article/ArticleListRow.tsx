import Link from "next/link";
import type { Article } from "@/domain/article";
import { articleHref } from "@/lib/articleRef";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";
import { CategoryKicker } from "./CategoryKicker";
import { ArticleBadges } from "./ArticleBadges";

/**
 * A search result: thumbnail left, headline and standfirst right.
 *
 * Search results are a different reading task from a front page. A front page
 * is browsed, so it earns big images and a grid. Results are *scanned* against
 * a query, and a dense list beats a card grid at that: three times as many
 * headlines fit above the fold, the eye travels one column instead of
 * zig-zagging, and there is room to show the publication so the reader can see
 * where each result came from. This is why Google News and the Guardian both
 * present search this way.
 */
export function ArticleListRow({ article }: { article: Article }) {
  return (
    <article className="group border-rule border-b py-5 first:pt-0">
      <div className="grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
        <Link
          href={articleHref(article)}
          className="overflow-hidden rounded-thumb"
        >
          <ArticleImage
            image={article.image}
            fallbackAlt={article.title}
            sizes="(max-width: 640px) 88px, 176px"
            className="aspect-[4/3] w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryKicker category={article.category} />
            <ArticleBadges article={article} showReadingTime={false} />
          </div>

          <h3 className="font-display text-ink mt-tight text-title-sm leading-[1.28] font-bold tracking-[-0.015em] text-pretty sm:text-title-lg">
            <Link
              href={articleHref(article)}
              className="decoration-brand underline-offset-4 hover:underline"
            >
              {article.title}
            </Link>
          </h3>

          {article.excerpt ? (
            <p className="text-ink-muted line-clamp-2-safe mt-tight hidden text-body sm:block">
              {article.excerpt}
            </p>
          ) : null}

          <ArticleMeta
            article={article}
            className="mt-element"
            showCategory={false}
            showPublication
            showReadingTime
          />
        </div>
      </div>
    </article>
  );
}

export function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <div>
      {articles.map((article) => (
        <ArticleListRow key={article.id} article={article} />
      ))}
    </div>
  );
}
