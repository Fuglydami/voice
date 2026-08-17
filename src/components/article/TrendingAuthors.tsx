import Link from "next/link";
import type { TrendingAuthor } from "@/domain/article";
import { formatArticleCount } from "@/lib/trending";
import { formatElapsed } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * The "Trending authors" rail below the sidebar stories.
 *
 * Each card links into a pre-filtered search for that author, which is what
 * makes the block functional rather than decorative, and is the third route
 * into the author filter alongside the byline links and the feed preferences.
 *
 * The secondary line shows the author's article count and when they last filed:
 * the two figures the ranking is actually computed from. It previously showed a
 * follower count invented from a hash of the author's id, which no API returns
 * and which therefore told the reader nothing true.
 */
export function TrendingAuthors({ authors }: { authors: TrendingAuthor[] }) {
  if (authors.length === 0) return null;

  return (
    <section aria-labelledby="trending-authors" className="mt-section">
      <SectionHeading id="trending-authors" title="Trending authors" />

      <ul className="mt-element grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {authors.map((author) => (
          <li
            key={author.id}
            className="border-rule border-b last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <Link
              href={`/search?authors=${encodeURIComponent(author.id)}`}
              className="group hover:bg-surface-sunken -mx-2 flex items-center gap-3  px-2 py-3 transition-colors"
            >
              <Avatar author={author} size={36} />

              <span className="min-w-0 flex-1">
                <span className="text-ink block truncate text-nav font-semibold">{author.name}</span>
                <span className="text-ink-faint block truncate text-meta">
                  {formatArticleCount(author.articleCount)}
                  {" · "}
                  {formatElapsed(author.latestPublishedAt)}
                </span>
              </span>

              <Icon
                name="north_east"
                size={16}
                className="text-ink-faint group-hover:text-brand shrink-0 transition-colors"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
