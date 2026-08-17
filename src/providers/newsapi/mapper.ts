import type { Article } from "@/domain/article";
import { resolveCategory } from "@/lib/categories";
import { hash, slugify, stripHtml, stripPublicationSuffix, truncate } from "@/lib/text";
import type { NewsApiArticle } from "./schema";
import type { PublisherCatalogue } from "./sources";

/**
 * NewsAPI wire format → domain `Article`.
 *
 * This is the thinnest of the three payloads: no section, no image metadata, no
 * word count, and a `content` field truncated at ~200 characters on the free
 * tier. The publisher catalogue is passed in to compensate for the missing
 * section — see `sources.ts`.
 */
export function mapNewsApiArticle(
  raw: NewsApiArticle,
  catalogue?: PublisherCatalogue,
): Article | null {
  const url = raw.url?.trim();
  const rawTitle = raw.title?.trim();
  if (!url || !rawTitle || rawTitle === "[Removed]") return null;

  const publication = raw.source?.name?.trim() || "NewsAPI";
  const title = stripPublicationSuffix(stripHtml(rawTitle), publication);
  if (!title) return null;

  const authorName = cleanAuthor(raw.author) ?? publication;
  const excerpt = truncate(stripHtml(raw.description ?? raw.content ?? ""), 260);
  const imageUrl = normalizeImage(raw.urlToImage);

  return {
    id: `newsapi:${hash(url)}`,
    title,
    excerpt,
    url,
    // NewsAPI gives a bare URL and nothing else: no alt text, caption, credit
    // or dimensions. The nulls here are honest rather than lossy.
    image: imageUrl
      ? { url: imageUrl, alt: null, caption: null, credit: null, width: null, height: null }
      : null,
    publishedAt: normalizeDate(raw.publishedAt),
    updatedAt: null,
    isLive: false,
    wordCount: null,
    kind: null,
    topics: [],
    author: {
      id: slugify(authorName),
      name: authorName,
      avatarUrl: null,
    },
    // The publisher's own category, from the catalogue, is a far better signal
    // than the headline. A single-subject outlet like ESPN files correctly even
    // when the headline contains no obvious keyword.
    category: resolveCategory({
      sections: [catalogue?.get(publication.toLowerCase())?.category],
      publication,
      text: [title, raw.description],
    }),
    sourceId: "newsapi",
    publication,
    providerRef: url,
    body: stripTruncationMarker(raw.content),
    bodyIsPartial: true,
  };
}

/** Removes NewsAPI's "… [+1234 chars]" truncation suffix. */
function stripTruncationMarker(content: string | null | undefined): string | null {
  if (!content) return null;
  const cleaned = stripHtml(content)
    .replace(/\s*…?\s*\[\+\d+\s*chars\]\s*$/i, "")
    .trim();
  return cleaned || null;
}

/**
 * Bylines arrive as `"By Jane Doe, CNN"`, `"jane@paper.com (Jane Doe)"` or a
 * comma-separated list. We keep the first human-looking name.
 */
function cleanAuthor(author: string | null | undefined): string | null {
  if (!author) return null;

  const emailWrapped = /\(([^)]+)\)/.exec(author);
  const base = emailWrapped?.[1] ?? author;

  const first = base
    .split(/,| and | & /i)[0]
    ?.replace(/^\s*by\s+/i, "")
    .trim();

  if (!first || first.length > 60 || first.includes("http") || first.includes("@")) return null;
  return first;
}

/** Drops protocol-relative and non-HTTPS thumbnails the optimiser would reject. */
function normalizeImage(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.startsWith("https://") ? trimmed : null;
}

function normalizeDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}
