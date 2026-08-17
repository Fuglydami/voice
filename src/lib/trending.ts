import type { Article, TrendingAuthor } from "@/domain/article";

/**
 * Derives the "Trending authors" rail from the current feed.
 *
 * Ranked by article count, ties broken on **recency** — not alphabetically. In a
 * feed of eighty articles almost every byline appears once, so an alphabetical
 * tie-break decided nearly the whole list and the rail rendered as a run of
 * A-names. Alphabetical order is not a trend.
 */

/**
 * Bylines that are not people. Aggregated feeds are full of them, and a desk
 * name sitting in a list headed "Trending authors" reads as a bug.
 */
const NON_PERSON_BYLINES = [
  "editorial",
  "staff",
  "newsroom",
  "news desk",
  "the associated press",
  "associated press",
  "reuters",
  "agencies",
  "guardian staff",
  "afp",
  "pa media",
  "breaking news",
];

export function trendingAuthors(articles: Article[], limit = 6): TrendingAuthor[] {
  const byAuthor = new Map<
    string,
    { author: Article["author"]; count: number; latest: number }
  >();

  for (const article of articles) {
    if (!isPerson(article)) continue;

    const publishedAt = Date.parse(article.publishedAt);
    const existing = byAuthor.get(article.author.id);

    if (existing) {
      existing.count += 1;
      existing.latest = Math.max(existing.latest, publishedAt || 0);
      // Prefer whichever record actually carries a headshot.
      if (!existing.author.avatarUrl && article.author.avatarUrl) {
        existing.author = article.author;
      }
    } else {
      byAuthor.set(article.author.id, {
        author: article.author,
        count: 1,
        latest: publishedAt || 0,
      });
    }
  }

  return [...byAuthor.values()]
    .sort((a, b) => b.count - a.count || b.latest - a.latest)
    .slice(0, limit)
    .map(({ author, count, latest }) => ({
      ...author,
      articleCount: count,
      latestPublishedAt: new Date(latest).toISOString(),
    }));
}

/**
 * Filters out bylines that are really the outlet: NewsAPI in particular often
 * returns the publication in the author field, which is how "CBS News" ends up
 * looking like a prolific journalist.
 */
export function isPersonByline(name: string, publication: string): boolean {
  const cleaned = name.trim().toLowerCase();
  if (!cleaned) return false;
  if (cleaned === publication.trim().toLowerCase()) return false;
  if (NON_PERSON_BYLINES.some((byline) => cleaned === byline || cleaned.includes(byline))) {
    return false;
  }

  // A real byline has a forename and a surname. This also removes single-word
  // desk labels the list above does not enumerate.
  if (!cleaned.includes(" ")) return false;

  // Desk bylines built from the masthead plus a section — "Guardian sport",
  // "Times business" — look like people by every test above: two words, not an
  // exact publication match, not on the list. They are caught by asking whether
  // the first word is part of the publication's own name.
  const [firstWord] = cleaned.split(" ");
  const outlet = publication.trim().toLowerCase();
  if (firstWord && firstWord.length > 3 && outlet.includes(firstWord)) return false;

  return true;
}

function isPerson(article: Article): boolean {
  return isPersonByline(article.author.name, article.publication);
}

/** "3 stories" / "1 story". */
export function formatArticleCount(count: number): string {
  return `${count} ${count === 1 ? "story" : "stories"}`;
}
