import type { Metadata } from "next";
import { CategorySchema, CATEGORY_LABELS } from "@/domain/article";
import { ArticleQuerySchema } from "@/domain/query";
import { aggregate } from "@/providers/aggregator";
import { availableProviders } from "@/providers/registry";
import { trendingAuthors } from "@/lib/trending";
import { HeroArticle } from "@/components/article/HeroArticle";
import { StoryList } from "@/components/article/StoryRow";
import { ArticleGrid } from "@/components/article/ArticleCard";
import { SectionBand, buildBands } from "@/components/article/SectionBand";
import { Section } from "@/components/ui/section-heading";
import { TrendingAuthors } from "@/components/article/TrendingAuthors";
import { EmptyState, PartialSourceNotice } from "@/components/ui/States";

/**
 * Top News — the screen from the mockup. A Server Component that calls the
 * aggregator directly rather than fetching its own `/api/articles`: going
 * through HTTP would be the server round-tripping to itself. The route handler
 * exists for the client-side pages, which genuinely need it.
 */

export const metadata: Metadata = { title: "Top News" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const category = CategorySchema.safeParse(params.category);
  const view = typeof params.view === "string" ? params.view : undefined;

  const query = ArticleQuerySchema.parse({
    categories: category.success ? category.data : undefined,
    pageSize: 24,
  });

  const { articles, sources } = await aggregate(availableProviders(), query);

  // "Top" leads with the most prominent story; "Latest" is strictly
  // reverse-chronological — otherwise the two views are one page with two names.
  const ordered = view === "latest" ? articles : byProminence(articles);

  const [hero, ...rest] = ordered;
  const sidebar = rest.slice(0, 3);
  const failed = sources.filter((source) => !source.ok);

  // Grouped into category bands, except when already narrowed to one category.
  const remainder = rest.slice(3);
  const bands = category.success ? [] : buildBands(remainder);
  const banded = new Set(bands.flatMap((band) => band.articles.slice(0, 4).map((a) => a.id)));
  const ungrouped = remainder.filter((article) => !banded.has(article.id)).slice(0, 8);

  const heading = category.success
    ? CATEGORY_LABELS[category.data]
    : view === "latest"
      ? "Latest"
      : "Top News";

  if (!hero) {
    return (
      <>
        <div className="mb-stack">
          <PartialSourceNotice failed={failed} hasResults={false} />
        </div>
        <EmptyState
          title={
            sources.length === 0 ? "No sources configured" : "No stories in this section right now"
          }
          description={
            sources.length === 0
              ? "Add at least one of NEWSAPI_KEY, GUARDIAN_KEY or NYT_KEY to your .env file and restart. See the README for where to get them."
              : "The configured sources have not published here recently. Try another section, or search across everything."
          }
        />
      </>
    );
  }

  return (
    <>
      {failed.length > 0 ? (
        <div className="mb-stack">
          <PartialSourceNotice failed={failed} />
        </div>
      ) : null}

      {/* The heading is visually hidden: the mockup leads straight into the
          photograph, but the document still needs an h1 before the content. */}
      <h1 className="sr-only">{heading}</h1>

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[1.62fr_1fr]">
        <HeroArticle article={hero} />

        <aside aria-label="More stories" className="lg:pl-2">
          <div className="border-rule -mt-5 border-t-0 lg:mt-0">
            <StoryList articles={sidebar} />
          </div>

          <TrendingAuthors authors={trendingAuthors(articles)} />
        </aside>
      </div>

      {bands.map((band) => (
        <SectionBand key={band.category} category={band.category} articles={band.articles} />
      ))}

      {ungrouped.length > 0 ? (
        <Section id="more-stories" title="More stories">
          <ArticleGrid articles={ungrouped} columns={4} />
        </Section>
      ) : null}
    </>
  );
}

/**
 * "Top" ordering: stories from the best-represented publications float up,
 * recency breaking ties. A crude proxy for prominence — none of the three APIs
 * exposes a popularity signal — but deterministic.
 */
function byProminence<T extends { publication: string; publishedAt: string }>(articles: T[]): T[] {
  const weight = new Map<string, number>();
  for (const article of articles) {
    weight.set(article.publication, (weight.get(article.publication) ?? 0) + 1);
  }

  return [...articles].sort(
    (a, b) =>
      (weight.get(b.publication) ?? 0) - (weight.get(a.publication) ?? 0) ||
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
