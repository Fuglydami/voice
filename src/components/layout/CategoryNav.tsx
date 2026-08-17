"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { activeNavHref, NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The section rail beneath the masthead.
 *
 * Split because reading the active item needs `useSearchParams`, which forces
 * client rendering on its whole subtree — and this rail lives in the root
 * layout, so unguarded it breaks the prerender of every static route. Only the
 * lookup sits behind the boundary; the markup is identical either way.
 */
export function CategoryNav() {
  return (
    <Suspense fallback={<CategoryNavRail activeHref={null} />}>
      <ActiveCategoryNav />
    </Suspense>
  );
}

function ActiveCategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <CategoryNavRail
      activeHref={activeNavHref(pathname, {
        view: searchParams.get("view"),
        category: searchParams.get("category"),
      })}
    />
  );
}

export function CategoryNavRail({ activeHref }: { activeHref: string | null }) {
  const activeRef = useRef<HTMLLIElement>(null);

  // On a phone the current section can sit off-screen in the scroll rail.
  // `block: "nearest"` keeps the page itself still.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeHref]);

  const views = NAV_ITEMS.filter((item) => !item.category);
  const sections = NAV_ITEMS.filter((item) => item.category);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = item.href === activeHref;
    return (
      <li key={item.href} ref={isActive ? activeRef : undefined} className="shrink-0">
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "-mb-px inline-block border-b-2 px-3 py-3.5 text-nav whitespace-nowrap transition-colors",
            isActive
              ? "border-brand text-ink font-semibold"
              : "text-ink-muted hover:text-ink border-transparent",
          )}
        >
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="News sections" className="border-rule border-b">
      <ul
        className={cn(
          "no-scrollbar mx-auto flex max-w-[82rem] items-stretch gap-x-1 overflow-x-auto px-gutter md:justify-center md:px-8",
          // Fade only while the rail can scroll; at `md` everything fits.
          "[mask-image:linear-gradient(90deg,transparent,#000_1.5rem,#000_calc(100%-1.5rem),transparent)]",
          "md:[mask-image:none]",
        )}
      >
        {views.map(renderItem)}

        <li aria-hidden className="flex shrink-0 items-center px-2">
          <span className="bg-rule h-4 w-px" />
        </li>

        {sections.map(renderItem)}
      </ul>
    </nav>
  );
}
