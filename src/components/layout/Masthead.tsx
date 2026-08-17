"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@/components/ui/Icon";
import { MenuSheet } from "./MenuSheet";
import { ThemeToggle } from "./ThemeToggle";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { cn } from "@/lib/utils";

/**
 * The masthead.
 *
 * A three-column grid with equal-width outer tracks, so the wordmark stays
 * optically centred no matter how many controls sit either side — a flex row
 * with `justify-between` shifts it whenever the two groups differ in width,
 * which they do.
 *
 * "My Feed" lives here rather than in the section rail below. The rail lists
 * sections of the news; a saved personal view is not a section, and mixing the
 * two made the rail mean two different things at once. Here it reads as what it
 * is: the reader's own space, beside their appearance preference.
 *
 * The bar is sticky and translucent. On a page that is mostly scrolling through
 * headlines, keeping search and the section rail permanently reachable removes
 * the trip back to the top the previous static header forced.
 */
export function Masthead() {
  const pathname = usePathname();
  const onFeed = pathname === "/feed";

  useSearchShortcut();

  return (
    <header className="border-rule bg-surface/85 supports-[backdrop-filter]:bg-surface/70 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto grid max-w-[82rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-gutter py-3 md:px-8">
        {/* Left — search and menu */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon">
                <Link href="/search" aria-label="Search articles">
                  <Icon name="search" size={19} />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Search <kbd className="ml-1 font-sans opacity-70">/</kbd>
            </TooltipContent>
          </Tooltip>

          <MenuSheet />
        </div>

        {/* Centre — wordmark */}
        <Link
          href="/"
          className="font-display text-ink text-center text-wordmark font-bold tracking-[0.14em] uppercase"
        >
          Voice
        </Link>

        {/* Right — the reader's own space */}
        <div className="flex items-center justify-end gap-1">
          <Button
            asChild
            variant={onFeed ? "secondary" : "ghost"}
            size="sm"
            className={cn("gap-1.5", onFeed && "text-ink")}
          >
            <Link href="/feed" aria-current={onFeed ? "page" : undefined}>
              <Icon name="person" size={17} />
              <span className="hidden sm:inline">My Feed</span>
              <span className="sr-only sm:hidden">My Feed</span>
            </Link>
          </Button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
