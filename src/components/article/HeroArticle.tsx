import Link from "next/link";
import type { Article } from "@/domain/article";
import { articleHref } from "@/lib/articleRef";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";
import { ArticleBadges } from "./ArticleBadges";

/**
 * The lead story: full-bleed photograph, category kicker, display headline,
 * standfirst and a read-more link. This is the left column of the mockup.
 *
 * The whole block is one `<article>` with the link on the headline rather than
 * a nest of overlapping links, so a screen-reader user gets one clear target
 * and the standfirst stays selectable.
 */
export function HeroArticle({ article }: { article: Article }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={articleHref(article)}
        className="overflow-hidden rounded-card"
      >
        <ArticleImage
          image={article.image}
          fallbackAlt={article.title}
          priority
          sizes="(max-width: 1024px) 100vw, 62vw"
          className="aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
      </Link>

      {/* The byline row already names the section, exactly as in the mockup, so
          the hero takes no separate kicker. Cards and list rows do, because
          they have no room for a full byline row above the headline. */}
      <ArticleMeta article={article} size="md" className="mt-element" showReadingTime />

      <ArticleBadges article={article} showReadingTime={false} className="mt-element" />

      {/* Sized to survive a real headline. Live Guardian and NYT headlines run
          to fifteen words, and at 3rem those wrapped to five lines and pushed
          the standfirst off the fold. A hero that overflows is a font-size
          error, not a copy problem. */}
      <h1 className="font-display text-ink mt-element text-display-sm font-bold tracking-[-0.028em] text-balance sm:text-display-md lg:text-display-lg">
        <Link
          href={articleHref(article)}
          className="decoration-brand decoration-2 underline-offset-[6px] hover:underline"
        >
          {article.title}
        </Link>
      </h1>

      {article.excerpt ? (
        <p className="text-ink-muted mt-element max-w-[62ch] text-body">{article.excerpt}</p>
      ) : null}

      <Link
        href={articleHref(article)}
        className="text-ink decoration-brand mt-element self-start text-meta font-semibold underline decoration-2 underline-offset-4 hover:no-underline"
      >
        read more
        <span className="sr-only"> about {article.title}</span>
      </Link>
    </article>
  );
}
