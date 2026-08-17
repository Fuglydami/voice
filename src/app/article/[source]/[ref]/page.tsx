import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SOURCE_IDS, SOURCE_LABELS } from "@/domain/article";
import { findProvider } from "@/providers/registry";
import { decodeArticleRef, isSourceId } from "@/lib/articleRef";
import { PROVIDER_TIMEOUT_MS } from "@/lib/env";
import { formatByline } from "@/lib/dates";
import { readingTime } from "@/lib/readingTime";
import { ArticleImage, ArticleImageCaption } from "@/components/article/ArticleImage";
import { ArticleBadges } from "@/components/article/ArticleBadges";
import { ArticleBody } from "@/components/article/ArticleBody";
import { CategoryKicker } from "@/components/article/CategoryKicker";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/Icon";

/**
 * The in-app reader. How much text arrives depends on the source, and the page
 * says which case you are in rather than pretending otherwise: the Guardian
 * returns a complete body, the NYT has no body field at all, and NewsAPI
 * truncates `content` at ~200 characters on the free tier.
 */

type Params = Promise<{ source: string; ref: string }>;

async function loadArticle(params: Params) {
  const { source, ref } = await params;

  if (!isSourceId(source, SOURCE_IDS)) return null;

  const decoded = decodeArticleRef(ref);
  if (!decoded) return null;

  const provider = findProvider(source);
  if (!provider?.isConfigured() || !provider.fetchArticle) return null;

  try {
    return await provider.fetchArticle(decoded, AbortSignal.timeout(PROVIDER_TIMEOUT_MS));
  } catch {
    // A dead upstream should render the not-found page, not a stack trace.
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const article = await loadArticle(params);
  if (!article) return { title: "Article not found" };

  return {
    title: article.title,
    description: article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image ? [article.image.url] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const article = await loadArticle(params);
  if (!article) notFound();

  const minutes = readingTime(article.wordCount);

  return (
    <>
      <ReadingProgress />

      <article className="mx-auto max-w-prose">
        <div className="mb-stack">
          <Button asChild variant="ghost" size="sm" className="-ml-2.5">
            <Link href="/">
              <Icon name="arrow_back" size={15} />
              Back to VOICE
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryKicker category={article.category} />
          <ArticleBadges article={article} showReadingTime={false} />
        </div>

        <h1 className="font-display text-ink mt-tight text-display-sm font-bold tracking-[-0.028em] text-balance sm:text-display-md">
          {article.title}
        </h1>

        {article.excerpt ? (
          <p className="text-ink-muted mt-element text-lead">{article.excerpt}</p>
        ) : null}

        <div className="mt-stack flex flex-wrap items-center gap-x-3 gap-y-2">
          <Avatar author={article.author} size={38} />

          <div className="min-w-0">
            <Link
              href={`/search?authors=${encodeURIComponent(article.author.id)}`}
              className="text-ink hover:text-brand block truncate text-nav font-semibold transition-colors"
            >
              {article.author.name}
            </Link>

            <p className="text-ink-faint text-meta">
              {article.publication}
              <span aria-hidden> · </span>
              <time dateTime={article.publishedAt}>{formatByline(article.publishedAt)}</time>
              {minutes ? (
                <>
                  <span aria-hidden> · </span>
                  {minutes}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <Separator className="mt-stack" />

        {article.image ? (
          <figure className="mt-stack">
            <ArticleImage
              image={article.image}
              fallbackAlt={article.title}
              priority
              sizes="(max-width: 768px) 100vw, 736px"
              className="rounded-card aspect-[16/9] w-full"
            />
            <ArticleImageCaption image={article.image} />
          </figure>
        ) : null}

        <ArticleBody article={article} />

        {/* Publisher topic tags, linked into a search. */}
        {article.topics.length > 0 ? (
          <nav aria-label="Topics" className="mt-section">
            <h2 className="text-ink-faint mb-element text-kicker font-semibold tracking-wider uppercase">
              Topics
            </h2>
            <ul className="flex flex-wrap gap-2">
              {article.topics.map((topic) => (
                <li key={topic}>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href={`/search?q=${encodeURIComponent(topic)}`}>{topic}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <aside className="border-rule rounded-card mt-section border p-6 text-center">
          <p className="text-ink text-title-sm font-semibold">
            {article.bodyIsPartial
              ? `Continue reading at ${article.publication}`
              : `Published by ${article.publication}`}
          </p>

          <p className="text-ink-muted mx-auto mt-tight max-w-md text-body">
            {article.bodyIsPartial
              ? `${SOURCE_LABELS[article.sourceId]} provides only an extract through its API. The full article is on the publisher's own site.`
              : "Read it in its original context, with the publisher's own formatting and any updates since."}
          </p>

          <Button asChild size="lg" className="mt-element">
            <a href={article.url} target="_blank" rel="noreferrer noopener">
              Read at {article.publication}
              <Icon name="north_east" size={15} />
            </a>
          </Button>
        </aside>
      </article>
    </>
  );
}
