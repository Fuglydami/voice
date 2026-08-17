import type { NewsProvider } from "@/domain/provider";
import type { SourceId } from "@/domain/article";
import { newsApiProvider } from "./newsapi/provider";
import { guardianProvider } from "./guardian/provider";
import { nytProvider } from "./nyt/provider";

/**
 * The composition root: the single place that knows which providers exist.
 * Adding a fourth is one import and one array entry.
 */
export const ALL_PROVIDERS: readonly NewsProvider[] = [
  newsApiProvider,
  guardianProvider,
  nytProvider,
] as const;

/**
 * The providers that can answer — queried by the aggregator, offered by the UI.
 * A missing key is a configuration state, not an error, so the provider is
 * skipped and the others still serve.
 *
 * There is deliberately no "query only the selected sources" variant: the source
 * filter is applied in `aggregate` after faceting, so that picking one source
 * does not erase the other two from the filter panel.
 */
export function availableProviders(): NewsProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider.isConfigured());
}

export function findProvider(id: SourceId): NewsProvider | undefined {
  return ALL_PROVIDERS.find((provider) => provider.id === id);
}
