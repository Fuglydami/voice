import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-shaped loading states.
 *
 * These compose shadcn's `Skeleton` primitive rather than reimplementing the
 * pulse. The point of each is that it occupies the same box as the content it
 * stands in for, so the swap when data arrives moves nothing: same hero
 * proportions, same thumbnail column, same line counts.
 */

export function HeroSkeleton() {
  return (
    <div className="space-y-element">
      <Skeleton className="rounded-card aspect-[16/10] w-full" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
    </div>
  );
}

export function StoryRowSkeleton() {
  return (
    <div className="space-y-3 py-5">
      <div className="grid grid-cols-[112px_1fr] gap-4">
        <Skeleton className="rounded-thumb aspect-[4/3]" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-rule space-y-3 border-t pt-4">
          <Skeleton className="rounded-thumb aspect-[16/10] w-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="border-rule grid grid-cols-[5.5rem_1fr] gap-4 border-b py-5 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-6"
        >
          <Skeleton className="rounded-thumb aspect-[4/3] w-full" />
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
