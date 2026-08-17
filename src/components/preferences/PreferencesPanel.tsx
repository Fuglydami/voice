"use client";

import { CATEGORIES, CATEGORY_LABELS, type ArticleFacets, type SourceId } from "@/domain/article";
import { usePreferences, usePreferencesStore } from "@/stores/preferences";
import { Chip } from "@/components/ui/chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Separator } from "@/components/ui/separator";

/**
 * The feed picker. Every option carries its count so a reader is not choosing
 * blind, and each group states what leaving it empty does — "empty means
 * everything" is worth saying out loud rather than implying.
 */
export function PreferencesPanel({ facets }: { facets: ArticleFacets }) {
  const preferences = usePreferences();
  const { toggleSource, toggleCategory, toggleAuthor } = usePreferencesStore();

  // The long tail of single-article bylines buries the regulars, so writers who
  // actually publish come first and the rest are dropped.
  const authors = facets.authors
    .filter((author, index) => author.count > 1 || index < 10)
    .slice(0, 16);

  return (
    <div className="space-y-stack">
      <Group
        icon="newspaper"
        title="Categories"
        hint="Leave empty to include every section."
        selected={preferences.categories.length}
      >
        {CATEGORIES.filter((category) => category !== "general").map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            count={facets.categories.find((facet) => facet.value === category)?.count}
            selected={preferences.categories.includes(category)}
            onToggle={() => toggleCategory(category)}
          />
        ))}
      </Group>

      <Separator />

      <Group
        icon="bookmark"
        title="Sources"
        hint="The three services your news comes from."
        selected={preferences.sources.length}
      >
        {facets.sources.length === 0 ? (
          <Placeholder>No sources configured. See the README.</Placeholder>
        ) : (
          facets.sources.map((source) => (
            <Chip
              key={source.value}
              label={source.label}
              count={source.count}
              selected={preferences.sources.includes(source.value as SourceId)}
              onToggle={() => toggleSource(source.value as SourceId)}
            />
          ))
        )}
      </Group>

      <Separator />

      <Group
        icon="person"
        title="Authors"
        hint="Follow specific bylines from whoever is publishing now."
        selected={preferences.authors.length}
      >
        {authors.length === 0 ? (
          <Placeholder>Authors appear once articles load.</Placeholder>
        ) : (
          authors.map((author) => (
            <Chip
              key={author.value}
              label={author.label}
              count={author.count}
              selected={preferences.authors.includes(author.value)}
              onToggle={() => toggleAuthor(author.value)}
            />
          ))
        )}
      </Group>
    </div>
  );
}

function Group({
  icon,
  title,
  hint,
  selected,
  children,
}: {
  icon: IconName;
  title: string;
  hint: string;
  selected: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-tight flex items-baseline gap-2">
        <Icon name={icon} size={16} className="text-ink-muted translate-y-0.5" />
        <h3 className="text-ink text-nav font-semibold">{title}</h3>
        {selected > 0 ? (
          <span className="text-brand text-meta font-semibold">{selected} selected</span>
        ) : null}
      </div>

      <p className="text-ink-muted mb-element text-meta">{hint}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-faint text-meta">{children}</p>;
}
