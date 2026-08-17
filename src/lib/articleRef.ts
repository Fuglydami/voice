import type { Article, SourceId } from "@/domain/article";

/**
 * Encodes and decodes the `/article/[source]/[ref]` path segment. A provider ref
 * is a Guardian path id or a full URL, so it needs escaping to survive a route
 * segment, and it must be reversible — it is handed back to the provider.
 *
 * Built on `btoa`/`atob` + `TextEncoder`, not `Buffer`: `toString("base64url")`
 * works in Node and Vitest but throws in a real browser, and these run in Client
 * Components. TextEncoder also keeps non-ASCII headlines correct.
 */
export function encodeArticleRef(ref: string): string {
  const bytes = new TextEncoder().encode(ref);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return toBase64(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeArticleRef(encoded: string): string | null {
  if (!encoded) return null;

  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = fromBase64(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    const decoded = new TextDecoder().decode(bytes);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

function toBase64(binary: string): string {
  return typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

function fromBase64(base64: string): string {
  return typeof atob === "function"
    ? atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
}

/** The in-app reader path for an article. */
export function articleHref(article: Pick<Article, "sourceId" | "providerRef">): string {
  return `/article/${article.sourceId}/${encodeArticleRef(article.providerRef)}`;
}

/** Narrowing helper for the dynamic `[source]` segment. */
export function isSourceId(value: string, ids: readonly SourceId[]): value is SourceId {
  return (ids as readonly string[]).includes(value);
}
