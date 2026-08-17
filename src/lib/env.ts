import "server-only";

/**
 * The only module that reads API keys from `process.env`. `server-only` makes
 * importing it from a Client Component a build error, so a key cannot reach a
 * browser bundle; no key uses the `NEXT_PUBLIC_` prefix.
 */

const read = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const serverEnv = {
  newsapiKey: read("NEWSAPI_KEY"),
  guardianKey: read("GUARDIAN_KEY"),
  nytKey: read("NYT_KEY"),
} as const;

/** Per-provider upstream timeout. Keeps one slow source from stalling the page. */
export const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS ?? 10_000);

/** How long normalised provider responses stay fresh, in seconds. */
export const PROVIDER_CACHE_SECONDS = Number(process.env.PROVIDER_CACHE_SECONDS ?? 300);
