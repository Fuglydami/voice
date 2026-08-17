import { NextResponse } from "next/server";
import { z } from "zod";
import { parseArticleQuery } from "@/domain/query";
import { aggregate } from "@/providers/aggregator";
import { availableProviders } from "@/providers/registry";
import { PROVIDER_CACHE_SECONDS } from "@/lib/env";

/**
 * `GET /api/articles` — the aggregation endpoint. It exists so API keys stay on
 * the server: the browser never talks to the providers directly. Query params
 * are the `ArticleQuery` schema in `domain/query.ts`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  let query;
  try {
    query = parseArticleQuery(searchParams);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        issues: error instanceof z.ZodError ? z.treeifyError(error) : undefined,
      },
      { status: 400 },
    );
  }

  // Every configured provider is queried, including ones filtered out: the
  // source filter runs after faceting so the panel keeps live counts on the
  // sources the reader has not picked.
  const providers = availableProviders();
  const result = await aggregate(providers, query);

  return NextResponse.json(result, {
    headers: {
      // Keeps repeat traffic inside the providers' free-tier rate limits.
      "Cache-Control": `public, s-maxage=${PROVIDER_CACHE_SECONDS}, stale-while-revalidate=${PROVIDER_CACHE_SECONDS * 2}`,
    },
  });
}
