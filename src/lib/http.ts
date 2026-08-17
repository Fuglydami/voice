import { PROVIDER_CACHE_SECONDS } from "./env";

/** Raised when an upstream API answers with a non-2xx status. */
export class UpstreamError extends Error {
  constructor(
    readonly source: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * The single JSON fetch used by every provider.
 *
 * Written once here so that timeout handling, cache policy, error shaping and
 * the user-agent header cannot drift between the three adapters (DRY).
 */
export async function fetchJson<T = unknown>(
  source: string,
  url: string,
  signal: AbortSignal,
  revalidateSeconds: number = PROVIDER_CACHE_SECONDS,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: "application/json", "User-Agent": "VOICE/1.0" },
      // Next dedupes and caches this on the server, keeping us inside the
      // free-tier rate limits when several readers hit the same filters.
      next: { revalidate: revalidateSeconds },
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new UpstreamError(source, 408, "Request timed out");
    }
    throw new UpstreamError(source, 0, cause instanceof Error ? cause.message : "Network error");
  }

  if (!response.ok) {
    throw new UpstreamError(
      source,
      response.status,
      response.status === 401 || response.status === 403
        ? "API key was rejected"
        : response.status === 429
          ? "Rate limit reached"
          : `Upstream responded ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

/** Builds a URL with the undefined/empty params dropped. */
export function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}
