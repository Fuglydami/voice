import { NextResponse } from "next/server";
import { ALL_PROVIDERS, availableProviders } from "@/providers/registry";

/**
 * `GET /api/sources` — which providers can answer, so the source filter only
 * offers usable ones. Reports configuration status, never the keys.
 */
export async function GET() {
  return NextResponse.json({
    sources: availableProviders().map((provider) => ({
      id: provider.id,
      label: provider.label,
      capabilities: provider.capabilities,
    })),
    // Includes unconfigured providers, for diagnostics.
    registered: ALL_PROVIDERS.map((provider) => ({
      id: provider.id,
      label: provider.label,
      configured: provider.isConfigured(),
    })),
  });
}
