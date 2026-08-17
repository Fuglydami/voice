import type { Article, ArticleImage, ArticleKind } from "@/domain/article";
import { resolveCategory } from "@/lib/categories";
import { hash, slugify, stripHtml, truncate } from "@/lib/text";
import type { NytDoc } from "./schema";

const NYT_IMAGE_BASE = "https://static01.nyt.com/";

/** New York Times wire format → domain `Article`. */
export function mapNytDoc(raw: NytDoc): Article | null {
  const url = raw.web_url?.trim();
  const title = stripHtml(raw.headline?.main ?? raw.headline?.print_headline ?? "");
  if (!url || !title) return null;

  const authorName = resolveAuthor(raw) ?? "The New York Times";

  return {
    id: `nyt:${hash(url)}`,
    title,
    excerpt: truncate(stripHtml(raw.abstract ?? raw.snippet ?? raw.lead_paragraph ?? ""), 260),
    url,
    image: resolveImage(raw),
    publishedAt: normalizeDate(raw.pub_date),
    // Article Search reports no modification time.
    updatedAt: null,
    isLive: false,
    wordCount: raw.word_count && raw.word_count > 0 ? raw.word_count : null,
    kind: resolveKind(raw.type_of_material),
    topics: resolveTopics(raw),
    category: resolveCategory({
      sections: [raw.section_name, raw.subsection_name, raw.news_desk],
      text: [raw.headline?.kicker, title],
    }),
    author: {
      id: slugify(authorName),
      name: authorName,
      // The Article Search API carries no contributor headshots.
      avatarUrl: null,
    },
    sourceId: "nyt",
    publication: raw.source?.trim() || "The New York Times",
    // `uri` is the NYT's own stable identifier. Preferred over the web URL,
    // which is what the single-article lookup previously had to match on.
    providerRef: raw.uri?.trim() || url,
    body: stripHtml(raw.lead_paragraph ?? raw.abstract ?? "") || null,
    bodyIsPartial: true,
  };
}

/** `type_of_material` states the kind of piece outright. */
function resolveKind(material: string | null | undefined): ArticleKind | null {
  const value = material?.trim().toLowerCase();
  if (!value) return null;

  if (value.includes("op-ed") || value.includes("editorial") || value.includes("letter")) {
    return "opinion";
  }
  if (value.includes("review")) return "review";
  if (value.includes("obituary")) return "obituary";
  if (value.includes("analysis") || value.includes("explainer")) return "analysis";
  if (value.includes("news")) return "news";

  return null;
}

/**
 * NYT keywords are typed: `Subject`, `Person`, `Location`, `Organization`.
 * Subjects and organisations make the most useful topic chips; person and
 * location tags tend to be long and specific to one story.
 */
function resolveTopics(raw: NytDoc): string[] {
  return (raw.keywords ?? [])
    .filter((keyword) => keyword.name === "subject" || keyword.name === "organizations")
    .map((keyword) => keyword.value?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 6);
}

/** Prefers the structured `person[]` entry, falling back to the raw byline string. */
function resolveAuthor(raw: NytDoc): string | null {
  const person = raw.byline?.person?.[0];
  if (person) {
    const name = [person.firstname, person.middlename, person.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (name) return name;
  }

  const original = raw.byline?.original?.replace(/^\s*by\s+/i, "").trim();
  if (!original) return null;

  const first = original.split(/,| and | & /i)[0]?.trim();
  return first && first.length <= 60 ? first : null;
}

/**
 * Handles both the object and legacy array `multimedia` shapes. The object form
 * also carries a caption and a photographer credit, which are mapped through so
 * the reader page can attribute the picture properly.
 */
function resolveImage(raw: NytDoc): ArticleImage | null {
  const media = raw.multimedia;
  if (!media) return null;

  if (Array.isArray(media)) {
    const path = (media.find((item) => item.subtype === "xlarge") ?? media[0])?.url;
    const url = absolute(path);
    return url ? { url, alt: null, caption: null, credit: null, width: null, height: null } : null;
  }

  const rendition = media.default ?? media.thumbnail;
  const url = absolute(rendition?.url);
  if (!url) return null;

  return {
    url,
    // The NYT supplies no dedicated alt text; its caption is the closest
    // equivalent and is a genuine description of the picture.
    alt: clean(media.caption),
    caption: clean(media.caption),
    credit: clean(media.credit),
    width: rendition?.width ?? null,
    height: rendition?.height ?? null,
  };
}

/** NYT image paths are site-relative and need joining onto the image host. */
function absolute(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return null;
  return `${NYT_IMAGE_BASE}${trimmed.replace(/^\//, "")}`;
}

function clean(value: string | null | undefined): string | null {
  const cleaned = stripHtml(value ?? "").trim();
  return cleaned || null;
}

function normalizeDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString();
}
