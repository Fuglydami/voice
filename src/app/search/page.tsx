import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every source at once and filter by date, category and publication.",
};

/**
 * `useSearchParams` requires a Suspense boundary above it, so the interactive
 * half lives in `SearchClient` and this stays a thin server shell. The fallback
 * mirrors the real layout, so the page does not jump when it hydrates.
 */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="border-rule h-40 rounded-card border" />
          <CardGridSkeleton />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
