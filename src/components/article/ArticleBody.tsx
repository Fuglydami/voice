import type { Article } from "@/domain/article";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { Icon } from "@/components/ui/Icon";

/**
 * The article text on the reader page.
 *
 * Two shapes, because the three sources give genuinely different things:
 *
 *  - A full HTML body (the Guardian) is sanitised and rendered with editorial
 *    typography.
 *  - An extract (NewsAPI, the NYT) is rendered as plain paragraphs behind a
 *    notice that says plainly that it is an extract. Dressing a two-sentence
 *    teaser up as an article would be the dishonest option, and a reader who
 *    scrolls to a sudden stop with no explanation has been misled.
 */
export function ArticleBody({ article }: { article: Article }) {
  if (!article.body) {
    return (
      <Notice>
        This source does not return article text through its API. The full piece is available at{" "}
        {article.publication}.
      </Notice>
    );
  }

  if (article.bodyIsPartial) {
    const paragraphs = article.body.split(/\n{2,}/).filter(Boolean);

    return (
      <div className="mt-stack">
        <div className="max-w-[38rem] space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-ink text-lead leading-[1.75]">
              {paragraph}
            </p>
          ))}
        </div>

        <Notice className="mt-stack">
          This is the extract {article.publication} makes available through its API, not the full
          article.
        </Notice>
      </div>
    );
  }

  return (
    <div
      className="article-body mt-stack max-w-[38rem]"
      // Sanitised on the server against a strict allowlist. See lib/sanitize.ts.
      dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.body) }}
    />
  );
}

function Notice({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`border-rule text-ink-muted flex items-start gap-2 rounded-thumb border border-dashed px-3.5 py-3 text-meta ${className}`}
    >
      <Icon name="info" size={16} className="text-ink-faint mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}
