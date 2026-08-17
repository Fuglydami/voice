import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/domain/article";

/**
 * Site footer. Not present in the mockup, which crops above it, but a news
 * front page that simply stops at the last story reads as unfinished — and the
 * section links here are a second, crawlable route into every category.
 */
export function Footer() {
  return (
    <footer className="border-rule mt-section border-t">
      <div className="mx-auto max-w-page px-gutter py-9 md:px-8">
        <div className="flex flex-col gap-7 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <p className="font-display text-ink text-wordmark font-bold tracking-[0.14em] uppercase">
              Voice
            </p>
            <p className="text-ink-muted mt-tight text-body">
              Stories aggregated from NewsAPI, The Guardian and The New York Times. Searchable,
              filterable and yours to personalise.
            </p>
          </div>

          <nav aria-label="Sections">
            <h2 className="text-ink-faint text-meta font-semibold tracking-wider uppercase">
              Sections
            </h2>
            <ul className="mt-element grid grid-cols-2 gap-x-8 gap-y-1.5">
              {CATEGORIES.filter((category) => category !== "general").map((category) => (
                <li key={category}>
                  <Link
                    href={`/?category=${category}`}
                    className="text-ink-muted hover:text-ink text-nav transition-colors"
                  >
                    {CATEGORY_LABELS[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="border-rule text-ink-faint mt-stack border-t pt-6 text-meta">
          Built as a frontend take-home challenge. Article content and links belong to their
          respective publishers.
        </p>
      </div>
    </footer>
  );
}
