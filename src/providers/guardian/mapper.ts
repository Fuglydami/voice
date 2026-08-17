import type { Article, ArticleImage, ArticleKind } from "@/domain/article";
import { resolveCategory } from "@/lib/categories";
import { hash, slugify, stripHtml, truncate } from "@/lib/text";
import type { GuardianResult } from "./schema";

/**
 * Guardian wire format → domain `Article`. Much the richest of the three: it
 * declares its own section, supplies headshots and a full body, and attaches
 * real alt text, captions and credits to its images.
 */
export function mapGuardianResult(raw: GuardianResult): Article | null {
  const url = raw.webUrl?.trim();
  const title = stripHtml(raw.fields?.headline ?? raw.webTitle ?? "");
  if (!url || !title) return null;

  const contributor = raw.tags?.find((tag) => tag.type === "contributor");
  const authorName =
    contributor?.webTitle?.trim() || cleanByline(raw.fields?.byline) || "The Guardian";

  // ONLY `liveBloggingNow`. The neighbouring `isLive` means "published, not a
  // draft" and is true for nearly every article; reading it as "live blog"
  // marked the entire feed live.
  const isLive = truthy(raw.fields?.liveBloggingNow);
  const publishedAt = normalizeDate(raw.fields?.firstPublicationDate ?? raw.webPublicationDate);
  const lastModified = raw.fields?.lastModified ? normalizeDate(raw.fields.lastModified) : null;

  return {
    id: `guardian:${hash(url)}`,
    title,
    // `standfirst` is richer than trailText but is sometimes a bulleted list of
    // live-blog links, so trailText wins when it reduces to almost nothing.
    excerpt: pickExcerpt(raw.fields?.standfirst, raw.fields?.trailText),
    url,
    image: resolveImage(raw),
    publishedAt,
    // Only when meaningfully later than publication.
    updatedAt:
      lastModified && Date.parse(lastModified) - Date.parse(publishedAt) > 60_000
        ? lastModified
        : null,
    isLive,
    wordCount: parseCount(raw.fields?.wordcount),
    kind: resolveKind(raw, isLive),
    topics: resolveTopics(raw),
    author: {
      id: slugify(authorName),
      name: authorName,
      avatarUrl: httpsOnly(contributor?.bylineImageUrl),
    },
    // The section is authoritative, and `pillarName` ("News", "Sport",
    // "Culture", "Lifestyle") is a useful coarse fallback when it is not.
    category: resolveCategory({
      sections: [raw.sectionName, raw.sectionId, raw.pillarName],
      text: [title],
    }),
    sourceId: "guardian",
    publication: "The Guardian",
    providerRef: raw.id?.trim() || url,
    // Plain text needs no sanitising; the HTML body is kept for the reader page.
    body: raw.fields?.body?.trim() || null,
    bodyIsPartial: false,
  };
}

/**
 * Lead image, taken from the `elements` array where the real metadata lives.
 * The flat `thumbnail` field is the fallback: it is only a URL, with no alt
 * text, caption, credit or dimensions attached.
 */
function resolveImage(raw: GuardianResult): ArticleImage | null {
  const element = raw.elements?.find(
    (candidate) => candidate.type === "image" && candidate.relation === "main",
  );

  // Assets run smallest to largest. Pick the smallest that is still big enough
  // to fill a card, rather than simply the widest under a cap: a portrait crop
  // can offer 333px and 4000px and nothing in between, and "widest under 1200"
  // chose the 333px one, which renders visibly soft.
  const assets = element?.assets ?? [];
  const usable = assets.filter((asset) => toNumber(asset.typeData?.width) >= 700);
  const best = usable[0] ?? assets.at(-1);

  const url = httpsOnly(best?.typeData?.secureFile ?? best?.file);

  if (url) {
    const data = best?.typeData;
    return {
      url,
      alt: cleanText(data?.altText),
      caption: cleanText(data?.caption),
      credit: cleanText(data?.credit ?? data?.photographer),
      width: toNumber(data?.width) || null,
      height: toNumber(data?.height) || null,
    };
  }

  const thumbnail = httpsOnly(raw.fields?.thumbnail);
  return thumbnail
    ? { url: thumbnail, alt: null, caption: null, credit: null, width: null, height: null }
    : null;
}

/** Guardian `tone/*` tags describe the kind of piece. */
function resolveKind(raw: GuardianResult, isLive: boolean): ArticleKind | null {
  if (isLive) return "live";

  const tones = (raw.tags ?? [])
    .filter((tag) => tag.type === "tone")
    .map((tag) => tag.id?.toLowerCase() ?? "");

  if (tones.some((tone) => tone.includes("comment") || tone.includes("editorial"))) return "opinion";
  if (tones.some((tone) => tone.includes("review"))) return "review";
  if (tones.some((tone) => tone.includes("obituar"))) return "obituary";
  if (tones.some((tone) => tone.includes("analysis") || tone.includes("explainer")))
    return "analysis";
  if (tones.some((tone) => tone.includes("news"))) return "news";

  return null;
}

/** Keyword tags, which are the Guardian's topic taxonomy. */
function resolveTopics(raw: GuardianResult): string[] {
  return (raw.tags ?? [])
    .filter((tag) => tag.type === "keyword")
    .map((tag) => tag.webTitle?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 6);
}

function pickExcerpt(standfirst: string | null | undefined, trailText: string | null | undefined) {
  const primary = truncate(stripHtml(standfirst ?? ""), 260);
  if (primary.length >= 60) return primary;
  return truncate(stripHtml(trailText ?? ""), 260) || primary;
}

function cleanByline(byline: string | null | undefined): string | null {
  if (!byline) return null;
  const first = byline
    .split(/,| and | & /i)[0]
    ?.replace(/^\s*by\s+/i, "")
    .trim();
  return first && first.length <= 60 ? first : null;
}

function cleanText(value: string | null | undefined): string | null {
  const cleaned = stripHtml(value ?? "").trim();
  return cleaned || null;
}

function truthy(value: boolean | string | null | undefined): boolean {
  return value === true || value === "true";
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : (value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value: string | null | undefined): number | null {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : null;
}

function httpsOnly(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.startsWith("https://") ? trimmed : null;
}

function normalizeDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}
