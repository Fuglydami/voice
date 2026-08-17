"use client";

import { useMemo, useState } from "react";
import type { ArticleFacets, SourceId } from "@/domain/article";
import { CATEGORY_LABELS, SOURCE_LABELS } from "@/domain/article";
import { useArticles } from "@/hooks/useArticles";
import {
  countPreferences,
  hasPreferences,
  usePreferences,
  usePreferencesStore,
} from "@/stores/preferences";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { ArticleGrid } from "@/components/article/ArticleCard";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { EmptyState, ErrorState, PartialSourceNotice } from "@/components/ui/States";
import { Button } from "@/components/ui/button";
import { RemovableChip } from "@/components/ui/chip";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const EMPTY_FACETS: ArticleFacets = { sources: [], categories: [], authors: [] };

/**
 * The personalised feed (requirement R2).
 *
 * Preferences compose into exactly the same `ArticleQuery` the search page
 * builds and go through the same endpoint, so personalisation is the general
 * query with the reader's choices pre-filled rather than a second data path.
 *
 * The picker is a sheet rather than an inline panel: expanding inline pushed the
 * articles down the page, so the thing you were editing jumped away from you.
 */
export function FeedClient() {
  const preferences = usePreferences();
  const { clear, toggleSource, toggleCategory, toggleAuthor } = usePreferencesStore();
  const [editing, setEditing] = useState(false);

  const configured = hasPreferences(preferences);
  const count = countPreferences(preferences);

  const query = useMemo(
    () => ({
      sources: preferences.sources,
      categories: preferences.categories,
      authors: preferences.authors,
      pageSize: 24,
    }),
    [preferences.sources, preferences.categories, preferences.authors],
  );

  // Held until the persisted store rehydrates, so the first request is not an
  // unfiltered one that is immediately thrown away.
  const { data, isPending, isFetching, isError, refetch } = useArticles(query, preferences.ready);

  const articles = useMemo(() => data?.articles ?? [], [data]);
  const facets = data?.facets ?? EMPTY_FACETS;
  const failed = data?.sources.filter((source) => !source.ok) ?? [];

  if (!preferences.ready) {
    return <CardGridSkeleton />;
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-section font-bold tracking-[-0.01em]">
            My Feed
          </h1>
          <p className="text-ink-muted mt-tight text-body">
            {configured
              ? `${data?.total.toLocaleString() ?? "—"} stories from your selections`
              : "A feed built from the categories, sources and writers you choose."}
          </p>
        </div>

        {configured ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Icon name="tune" size={17} />
            Edit feed
            <span className="text-ink-faint tabular-nums">{count}</span>
          </Button>
        ) : null}
      </header>

      {configured ? (
        <ActivePreferences
          preferences={preferences}
          onRemoveSource={toggleSource}
          onRemoveCategory={toggleCategory}
          onRemoveAuthor={toggleAuthor}
          onClear={clear}
        />
      ) : null}

      {failed.length > 0 ? (
        <div className="mt-stack">
          <PartialSourceNotice failed={failed} hasResults={articles.length > 0} />
        </div>
      ) : null}

      <section aria-label="Your articles" className="mt-stack">
        {!configured ? (
          <Onboarding onStart={() => setEditing(true)} />
        ) : isPending ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </ErrorState>
        ) : articles.length === 0 ? (
          <EmptyState
            title="Nothing matches your picks yet"
            description="Your chosen sources have not published in these categories recently. Widening the selection usually fixes it."
          >
            <Button variant="outline" onClick={() => setEditing(true)}>
              Adjust your feed
            </Button>
          </EmptyState>
        ) : (
          <div className={cn("transition-opacity", isFetching && "opacity-55")}>
            <ArticleGrid articles={articles} />
          </div>
        )}
      </section>

      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="right" className="w-[min(28rem,92vw)] gap-0 p-0">
          <SheetHeader className="px-6 py-5">
            <SheetTitle>Edit your feed</SheetTitle>
            <SheetDescription>
              Changes apply immediately and are saved in this browser.
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <PreferencesPanel facets={facets} />
          </div>

          <Separator />

          {/* A live count is the whole point of editing in a sheet: the feed is
              re-queried as you toggle, so the effect of each choice is visible
              without closing the panel and scrolling. */}
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-ink-muted text-meta" role="status" aria-live="polite">
              {isFetching
                ? "Updating…"
                : `${data?.total.toLocaleString() ?? 0} ${data?.total === 1 ? "story" : "stories"} match`}
            </p>

            <div className="flex items-center gap-2">
              {count > 0 ? (
                <Button variant="ghost" size="sm" onClick={clear}>
                  Reset
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** First-run state: what the feature is, what it costs, and one action. */
function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <div className="border-rule rounded-card mx-auto  border border-dashed px-6 py-12 text-center">
      <span className="bg-brand-soft text-brand mx-auto flex size-11 items-center justify-center rounded-full">
        <Icon name="person" size={22} />
      </span>

      <h2 className="font-display text-ink mt-element text-title-sm font-bold">
        Build your own front page
      </h2>

      <p className="text-ink-muted mx-auto mt-tight max-w-sm text-body">
        Choose the categories, sources and writers you care about, and this page becomes a feed of
        only those stories. No account needed — your choices stay in this browser.
      </p>

      <Button className="mt-stack" onClick={onStart}>
        <Icon name="tune" size={17} />
        Choose what you follow
      </Button>
    </div>
  );
}

/**
 * The active selections, each removable in place — a choice you cannot see is a
 * choice you cannot undo.
 */
function ActivePreferences({
  preferences,
  onRemoveSource,
  onRemoveCategory,
  onRemoveAuthor,
  onClear,
}: {
  preferences: ReturnType<typeof usePreferences>;
  onRemoveSource: (id: SourceId) => void;
  onRemoveCategory: (id: (typeof preferences.categories)[number]) => void;
  onRemoveAuthor: (id: string) => void;
  onClear: () => void;
}) {
  const total = countPreferences(preferences);

  return (
    <div className="mt-element flex flex-wrap items-center gap-2">
      <span className="text-ink-faint text-meta">Following</span>

      {preferences.categories.map((category) => (
        <RemovableChip
          key={`c-${category}`}
          label={CATEGORY_LABELS[category]}
          onRemove={() => onRemoveCategory(category)}
        />
      ))}

      {preferences.sources.map((source) => (
        <RemovableChip
          key={`s-${source}`}
          label={SOURCE_LABELS[source]}
          onRemove={() => onRemoveSource(source)}
        />
      ))}

      {preferences.authors.map((author) => (
        <RemovableChip
          key={`a-${author}`}
          label={titleCase(author)}
          onRemove={() => onRemoveAuthor(author)}
        />
      ))}

      {total > 1 ? (
        <Button variant="ghost" size="xs" onClick={onClear}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
}

/** `"mary-frost"` reads better as `"Mary Frost"` in a chip. */
function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
