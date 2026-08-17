import type { Article, Category } from "@/domain/article";
import { CATEGORY_LABELS } from "@/domain/article";
import { ArticleCard } from "./ArticleCard";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * One category band on the front page: a section rule, its name, a "see all"
 * link, and a row of stories. Bands let a reader skip whole sections at a glance
 * and give each story the context of its section, which a flat grid cannot.
 */
export function SectionBand({
  category,
  articles,
}: {
  category: Category;
  articles: Article[];
}) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby={`band-${category}`} className="mt-section">
      <SectionHeading
        id={`band-${category}`}
        title={CATEGORY_LABELS[category]}
        action={{ href: `/?category=${category}`, label: "See all" }}
        className="mb-stack"
      />

      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {articles.slice(0, 4).map((article) => (
          <ArticleCard key={article.id} article={article} showExcerpt={false} />
        ))}
      </div>
    </section>
  );
}

/**
 * Groups a feed into bands, largest section first, skipping any section too
 * thin to fill a row. An empty or one-item band looks broken, so the threshold
 * is enforced here rather than left to the caller.
 */
export function buildBands(
  articles: Article[],
  { minPerBand = 3, maxBands = 4 }: { minPerBand?: number; maxBands?: number } = {},
): { category: Category; articles: Article[] }[] {
  const grouped = new Map<Category, Article[]>();

  for (const article of articles) {
    // "general" is the unclassified fallback, not a section a reader chose.
    if (article.category === "general") continue;

    const bucket = grouped.get(article.category);
    if (bucket) bucket.push(article);
    else grouped.set(article.category, [article]);
  }

  return [...grouped.entries()]
    .filter(([, items]) => items.length >= minPerBand)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, maxBands)
    .map(([category, items]) => ({ category, articles: items }));
}
