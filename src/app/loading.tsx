import { HeroSkeleton, StoryRowSkeleton } from "@/components/ui/skeletons";

/**
 * Route-level loading UI. The front page is a Server Component that fans out to
 * three APIs, so without this the browser sits on the previous page with no sign
 * anything is happening. The skeleton mirrors the real layout so the swap does
 * not move anything.
 */
export default function Loading() {
  return (
    <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[1.62fr_1fr]">
      <HeroSkeleton />

      <div className="lg:pl-2">
        <div className="divide-rule divide-y">
          <StoryRowSkeleton />
          <StoryRowSkeleton />
          <StoryRowSkeleton />
        </div>
      </div>
    </div>
  );
}
