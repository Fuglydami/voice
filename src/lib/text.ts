/** Small pure string helpers shared by the provider mappers. */

/** URL/preference-safe slug. `"Adam Strong"` → `"adam-strong"`. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Short, stable, non-cryptographic hash (FNV-1a) used to build article ids.
 * Deterministic across processes, which matters because ids become React keys
 * and must not change between a server render and a client refetch.
 */
export function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Strips HTML tags and collapses whitespace — several APIs return HTML excerpts. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncates on a word boundary with an ellipsis. */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/**
 * NewsAPI and others append the publication to the headline (`"Headline - BBC
 * News"`). Removing it keeps headlines clean and, more importantly, lets the
 * deduper recognise the same story arriving from two providers.
 */
export function stripPublicationSuffix(title: string, publication: string): string {
  if (!publication) return title.trim();
  const suffix = new RegExp(`\\s*[-–—|]\\s*${escapeRegExp(publication)}\\s*$`, "i");
  return title.replace(suffix, "").trim();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Comparison key for dedupe: case/punctuation-insensitive title. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
